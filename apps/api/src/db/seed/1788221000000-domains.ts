import type { QueryRunner } from 'typeorm';

/**
 * The two domains in v1. Adding a third is a row here (or through the admin
 * API) plus DNS — no code change, no rebuild. See docs/ARCHITECTURE.md §4.
 */
export default async function seed(qr: QueryRunner): Promise<void> {
  const domains = [
    {
      Host: 'payee.id',
      IsDefault: true,
      BrandName: 'payee.id',
      Tagline: 'One link. Any way to pay you.',
      SupportEmail: 'hello@payee.id',
      MailFromAddress: 'no-reply@payee.id',
      SortOrder: 0,
      ThemeConfig: {
        fontKey: 'inter',
        radius: '0.75rem',
        defaultMode: 'system',
        colors: {
          background: '#ffffff',
          surface: '#fafafa',
          foreground: '#0a0a0a',
          muted: '#71717a',
          border: '#e4e4e7',
          accent: '#0a0a0a',
          accentForeground: '#ffffff',
        },
      },
    },
    {
      Host: 'recv.to',
      IsDefault: false,
      BrandName: 'recv.to',
      Tagline: 'Get paid, anywhere.',
      SupportEmail: 'hello@recv.to',
      MailFromAddress: 'no-reply@recv.to',
      SortOrder: 1,
      ThemeConfig: {
        fontKey: 'inter',
        radius: '0.75rem',
        defaultMode: 'system',
        colors: {
          background: '#ffffff',
          surface: '#fafafa',
          foreground: '#0a0a0a',
          muted: '#71717a',
          border: '#e4e4e7',
          accent: '#0a0a0a',
          accentForeground: '#ffffff',
        },
      },
    },
  ];

  for (const d of domains) {
    await qr.query(
      `INSERT INTO core."Domains"
         ("Host", "IsActive", "IsDefault", "BrandName", "Tagline",
          "SupportEmail", "MailFromAddress", "ThemeConfig", "SortOrder")
       VALUES ($1, true, $2, $3, $4, $5, $6, $7::jsonb, $8)
       ON CONFLICT ("Host") DO NOTHING`,
      [
        d.Host,
        d.IsDefault,
        d.BrandName,
        d.Tagline,
        d.SupportEmail,
        d.MailFromAddress,
        JSON.stringify(d.ThemeConfig),
        d.SortOrder,
      ],
    );
  }
}
