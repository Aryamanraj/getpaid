import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { PublicProfile } from '@recv/shared';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { userGradient } from '@/lib/avatar';
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
  const gradient = userGradient(profile.userName);
  const verified = profile.acceptedAssets.some((a) => a.isProven);

  return (
    <main className="bg-dots mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-12 sm:px-6 sm:py-16">
      <header className="reveal flex flex-col items-center text-center">
        <div
          className="rounded-full p-[3px] [box-shadow:var(--shadow-md)]"
          style={{ background: gradient }}
        >
          {profile.avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: user-supplied remote URL
            <img
              src={profile.avatarUrl}
              alt=""
              width={88}
              height={88}
              className="h-22 w-22 rounded-full border-2 border-[color:var(--color-background)] object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-22 w-22 items-center justify-center rounded-full border-2 border-[color:var(--color-background)] text-3xl font-semibold text-white"
              style={{ background: gradient }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <p className="mt-5 text-xs font-medium tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
          Pay
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{name}</h1>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1 font-mono text-xs text-[color:var(--color-muted)]">
            {profile.userName}.{bootstrap.domain.host}
          </span>
          {verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-success)] bg-[color:var(--color-success-soft)] px-3 py-1 text-xs font-medium text-[color:var(--color-success)]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-current"
              />
              Verified wallet
            </span>
          ) : null}
        </div>

        {profile.bio ? (
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[color:var(--color-muted)]">
            {profile.bio}
          </p>
        ) : null}
      </header>

      <PayFlow profile={profile} brandName={bootstrap.domain.brandName} />

      <footer className="mt-auto pt-10 text-center text-xs text-[color:var(--color-muted)]">
        {bootstrap.domain.brandName} · non-custodial · source-available
      </footer>
    </main>
  );
}
