export const RESERVED_SUBDOMAINS = new Set([
  'api',
  'app',
  'admin',
  'www',
  'docs',
  'mail',
  'cdn',
  'status',
  'assets',
  'static',
]);

export interface ParsedHost {
  host: string;
  rootDomain: string;
  subdomain: string | null;
}

/**
 * Pure string work — no network call, so middleware stays cheap and cannot
 * fail on a cold cache. The API's bootstrap endpoint is the authority on
 * which domains actually exist; an unknown host 404s there, not here.
 *
 * Takes the last two labels as the root domain. That holds for payee.id and
 * recv.to; a future domain on a multi-part TLD (example.co.uk) would need an
 * override list.
 */
export function parseHost(rawHost: string): ParsedHost {
  const host = (rawHost ?? '').trim().toLowerCase().split(':')[0];
  const labels = host.split('.').filter(Boolean);

  // "aryaman.localhost" — one label of root, so the dev case still splits.
  const rootLabelCount = labels[labels.length - 1] === 'localhost' ? 1 : 2;

  if (labels.length <= rootLabelCount) {
    return { host, rootDomain: host, subdomain: null };
  }

  const rootDomain = labels.slice(-rootLabelCount).join('.');
  const subdomain = labels.slice(0, -rootLabelCount).join('.');

  return { host, rootDomain, subdomain };
}

export function isReservedSubdomain(subdomain: string | null): boolean {
  return !!subdomain && RESERVED_SUBDOMAINS.has(subdomain);
}
