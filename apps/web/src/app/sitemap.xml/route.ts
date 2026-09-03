import type { NextRequest } from 'next/server';
import { parseHost } from '@/lib/host';
import { getBootstrap } from '@/lib/bootstrap';
import { blogEnabled, getBlogFeed } from '@/lib/blog';

/**
 * Host-aware sitemap: one build serves many domains, so URLs are built from
 * the requesting host's root domain. Dotted paths bypass the middleware, so
 * the host is resolved here directly.
 */
export const dynamic = 'force-dynamic';

const xml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(request: NextRequest) {
  const { rootDomain } = parseHost(request.headers.get('host') ?? '');
  const bootstrap = await getBootstrap(rootDomain);
  if (!bootstrap) return new Response('Not found', { status: 404 });

  const base = `https://${rootDomain}`;
  const urls: Array<{ loc: string; lastmod?: string }> = [{ loc: base }];

  if (blogEnabled(bootstrap, rootDomain)) {
    urls.push({ loc: `${base}/blog` });
    const posts = (await getBlogFeed(rootDomain, 5000)) ?? [];
    for (const p of posts) {
      urls.push({
        loc: `${base}/blog/${p.slug}`,
        lastmod: p.publishedAt,
      });
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${xml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
