import type { QueryRunner } from 'typeorm';

/**
 * A username becomes a subdomain, so anything that could be mistaken for
 * infrastructure or for us has to be off the table before the first claim.
 */
export default async function seed(qr: QueryRunner): Promise<void> {
  const infrastructure = [
    'api',
    'app',
    'admin',
    'www',
    'docs',
    'mail',
    'smtp',
    'imap',
    'pop',
    'cdn',
    'status',
    'assets',
    'static',
    'ftp',
    'ns',
    'ns1',
    'ns2',
    'mx',
    'webmail',
    'autoconfig',
    'autodiscover',
    'localhost',
    'test',
    'staging',
    'dev',
    'preview',
    'internal',
    'vpn',
    'proxy',
    'dashboard',
    'console',
  ];

  const brand = [
    'payee',
    'recv',
    'support',
    'help',
    'billing',
    'security',
    'legal',
    'abuse',
    'privacy',
    'terms',
    'contact',
    'team',
    'careers',
    'jobs',
    'press',
    'blog',
    'about',
    'pricing',
    'login',
    'signup',
    'signin',
    'register',
    'account',
    'settings',
    'profile',
    'me',
    'you',
    'official',
  ];

  const payments = [
    'pay',
    'payment',
    'payments',
    'wallet',
    'invoice',
    'checkout',
    'refund',
    'escrow',
    'bank',
    'crypto',
    'bitcoin',
    'ethereum',
    'usdc',
    'usdt',
  ];

  const rows: Array<[string, string]> = [
    ...infrastructure.map((n) => [n, 'infrastructure'] as [string, string]),
    ...brand.map((n) => [n, 'brand'] as [string, string]),
    ...payments.map((n) => [n, 'payments'] as [string, string]),
  ];

  for (const [name, reason] of rows) {
    await qr.query(
      `INSERT INTO core."ReservedUserNames" ("Name", "Reason")
       VALUES ($1, $2)
       ON CONFLICT ("Name") DO NOTHING`,
      [name, reason],
    );
  }
}
