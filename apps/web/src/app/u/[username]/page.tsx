import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { PublicProfile } from '@recv/shared';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { accentFor } from '@/lib/avatar';
import { PayFlow } from '@/components/pay-flow';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function getProfile(
  userName: string,
  host: string,
): Promise<PublicProfile | null> {
  try {
    const res = await fetch(
      `${API_URL}/user/getProfile/${encodeURIComponent(userName)}?host=${encodeURIComponent(host)}`,
      {
        next: { revalidate: 30 },
      },
    );
    const body = (await res.json()) as {
      success: boolean;
      data: PublicProfile;
    };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const host = await getHost();
  const [bootstrap, profile] = await Promise.all([
    getBootstrap(host),
    getProfile(username, host),
  ]);
  if (!bootstrap || !profile) return {};
  const name = profile.displayName || profile.userName;
  return {
    title: `Pay ${name} · ${bootstrap.domain.brandName}`,
    alternates: {
      canonical: `https://${profile.userName}.${bootstrap.domain.host}`,
    },
    description:
      profile.bio || `Pay ${name} in crypto — one link, no account needed.`,
    openGraph: {
      title: `Pay ${name}`,
      description:
        profile.bio || `${profile.acceptedAssets.length} ways to pay`,
      siteName: bootstrap.domain.brandName,
      images: profile.avatarUrl ? [{ url: profile.avatarUrl }] : undefined,
    },
  };
}

/**
 * Reached from aryaman.payee.id via the middleware rewrite, or directly at
 * payee.id/u/aryaman. Server-rendered so it unfurls when pasted into a chat.
 */
export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const host = await getHost();
  const [bootstrap, profile] = await Promise.all([
    getBootstrap(host),
    getProfile(username, host),
  ]);
  if (!bootstrap || !profile) notFound();

  const name = profile.displayName || profile.userName;
  const accent = accentFor(profile.userName, profile.accentHue);
  const verified = profile.acceptedAssets.some((a) => a.isProven);

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-12 sm:px-6 sm:py-16"
      style={
        {
          // The payee's one customization knob recolours every accent on
          // their page — buttons, chips, caret — through the normal tokens.
          '--color-accent': accent.strong,
          '--color-accent-foreground': '#ffffff',
        } as React.CSSProperties
      }
    >
      <header className="flex items-center gap-4">
        {profile.avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: user-supplied remote URL
          <img
            src={profile.avatarUrl}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-2xl border border-[color:var(--color-border)] object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl font-mono text-2xl font-semibold"
            style={{ background: accent.bg, color: accent.fg }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {name}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-sm text-[color:var(--color-muted)]">
            <span className="truncate">
              {profile.userName}.{bootstrap.domain.host}
            </span>
            {verified ? (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                aria-label="Verified wallet"
                className="shrink-0 text-[color:var(--color-success)]"
              >
                <title>Verified wallet</title>
                <circle cx="12" cy="12" r="10" fill="currentColor" />
                <path
                  d="M7.5 12.5l3 3 6-7"
                  stroke="var(--color-surface)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </p>
        </div>
      </header>

      {profile.bio ? (
        <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--color-muted)]">
          {profile.bio}
        </p>
      ) : null}

      <PayFlow profile={profile} brandName={bootstrap.domain.brandName} />

      <footer className="mt-auto pt-10 text-center text-xs text-[color:var(--color-muted)]">
        {bootstrap.domain.brandName} · non-custodial · source-available
      </footer>
    </main>
  );
}
