import type { NextRequest } from 'next/server';
import { parseHost } from '@/lib/host';

/**
 * App surfaces are kept out of the crawl budget; articles and profiles are
 * what search engines should spend it on.
 */
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const { rootDomain } = parseHost(request.headers.get('host') ?? '');
  const body = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /login
Disallow: /r/

Sitemap: https://${rootDomain}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
