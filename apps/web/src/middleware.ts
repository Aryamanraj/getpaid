import { NextRequest, NextResponse } from 'next/server';
import { isReservedSubdomain, parseHost } from '@/lib/host';

/**
 * aryaman.payee.id → /u/aryaman, on any domain, with no per-domain code.
 * See docs/ARCHITECTURE.md §4.
 *
 * The parsed host is forwarded as *request* headers — that is what server
 * components read via headers(). Setting them on the response would only
 * reach the browser.
 */
export function middleware(request: NextRequest) {
  const { subdomain, rootDomain, host } = parseHost(
    request.headers.get('host') ?? '',
  );

  const headers = new Headers(request.headers);
  headers.set('x-recv-host', host);
  headers.set('x-recv-root-domain', rootDomain);
  const forward = { request: { headers } };

  if (!subdomain || subdomain === 'www' || isReservedSubdomain(subdomain)) {
    return NextResponse.next(forward);
  }

  const url = request.nextUrl.clone();

  // Only the bare subdomain root maps to a profile; deeper paths pass through
  // so /login on a subdomain still reaches /login.
  if (url.pathname === '/') {
    url.pathname = `/u/${subdomain}`;
    return NextResponse.rewrite(url, forward);
  }

  return NextResponse.next(forward);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
