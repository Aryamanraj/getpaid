import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Inter } from 'next/font/google';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { themeToCssVars } from '@/lib/theme';
import { Providers } from '@/components/providers';
import { Analytics } from '@/components/analytics';
import './globals.css';

/*
 * next/font is build-time only, so fonts cannot be fully dynamic. A small
 * allowlist is bundled and Domains.ThemeConfig.fontKey selects among them —
 * adding a family is the one branding change that needs a build.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
});

const FONT_STACKS: Record<string, string> = {
  inter: 'var(--font-inter)',
  'ibm-plex': 'var(--font-plex-sans)',
};

export async function generateMetadata(): Promise<Metadata> {
  const host = await getHost();
  const bootstrap = await getBootstrap(host);
  return {
    metadataBase: new URL(`https://${host}`),
    title: bootstrap?.domain.brandName ?? 'payee.id',
    description: bootstrap?.domain.tagline ?? 'One link. Any way to pay you.',
    icons: bootstrap?.domain.faviconUrl
      ? [{ url: bootstrap.domain.faviconUrl }]
      : [{ url: '/favicon.ico', type: 'image/png' }],
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = await getHost();
  const bootstrap = await getBootstrap(host);
  const theme = bootstrap?.domain.theme ?? {};
  const fontStack =
    FONT_STACKS[theme.fontKey ?? 'ibm-plex'] ?? FONT_STACKS['ibm-plex'];
  const css = `${themeToCssVars(theme)}\n:root { --font-sans: ${fontStack}; --font-mono: var(--font-plex-mono); }`;
  const solanaRpcUrl =
    (bootstrap?.publicConfig?.['web.solanaRpcUrl'] as string) ??
    'https://api.mainnet-beta.solana.com';

  return (
    <html
      lang="en"
      className={`${inter.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <head>
        <style>{css}</style>
      </head>
      <body className="font-sans">
        <Providers solanaRpcUrl={solanaRpcUrl}>{children}</Providers>
        <Analytics
          posthogKey={
            (bootstrap?.publicConfig?.['analytics.posthogKey'] as string) ?? ''
          }
          posthogHost={
            (bootstrap?.publicConfig?.['analytics.posthogHost'] as string) ?? ''
          }
        />
      </body>
    </html>
  );
}
