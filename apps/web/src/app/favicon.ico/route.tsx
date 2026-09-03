import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { parseHost } from '@/lib/host';
import { getBootstrap } from '@/lib/bootstrap';

/**
 * Per-domain favicon, generated from the domain row: brand initial on the
 * theme accent. Domains.FaviconUrl, when set, overrides this via the layout
 * metadata; this is the always-present fallback browsers request by default.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { rootDomain } = parseHost(request.headers.get('host') ?? '');
  const bootstrap = await getBootstrap(rootDomain);
  const brand = bootstrap?.domain.brandName ?? rootDomain ?? 'r';
  const colors = bootstrap?.domain.theme?.colors ?? {};
  const bg = colors.accent ?? '#0a0a0a';
  const fg = colors.accentForeground ?? '#ffffff';

  const image = new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: fg,
        borderRadius: 7,
        fontSize: 20,
        fontWeight: 700,
      }}
    >
      {brand.charAt(0).toUpperCase()}
    </div>,
    { width: 32, height: 32 },
  );

  return new Response(image.body, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
