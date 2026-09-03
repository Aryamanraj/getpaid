import type { NextRequest } from 'next/server';
import { parseHost } from '@/lib/host';
import { getBootstrap } from '@/lib/bootstrap';
import { blogEnabled, getBlogFeed } from '@/lib/blog';

export const dynamic = 'force-dynamic';

const xml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(request: NextRequest) {
  const { rootDomain } = parseHost(request.headers.get('host') ?? '');
  const bootstrap = await getBootstrap(rootDomain);
  if (!bootstrap || !blogEnabled(bootstrap, rootDomain))
    return new Response('Not found', { status: 404 });

  const base = `https://${rootDomain}`;
  const posts = (await getBlogFeed(rootDomain, 50)) ?? [];
  const brand = bootstrap.domain.brandName;

  const items = posts
    .map(
      (p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${base}/blog/${xml(p.slug)}</link>
      <guid isPermaLink="true">${base}/blog/${xml(p.slug)}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <description>${xml(p.excerpt)}</description>
      <category>${xml(p.topic)}</category>
    </item>`,
    )
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(brand)} Blog</title>
    <link>${base}/blog</link>
    <atom:link href="${base}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Crypto, payments, and prediction markets from ${xml(brand)}.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=1800',
    },
  });
}
