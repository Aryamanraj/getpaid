import type { NextRequest } from 'next/server';
import { parseHost } from '@/lib/host';
import { getBootstrap } from '@/lib/bootstrap';

/**
 * IndexNow key verification file. Engines fetch this to confirm that pings
 * naming this host really come from its owner. The key is public by
 * protocol; an empty config turns the route (and thus pings) off.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { rootDomain } = parseHost(request.headers.get('host') ?? '');
  const bootstrap = await getBootstrap(rootDomain);
  const key = bootstrap?.publicConfig?.['blog.indexNowKey'];
  if (typeof key !== 'string' || key.length === 0)
    return new Response('Not found', { status: 404 });

  return new Response(key, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
