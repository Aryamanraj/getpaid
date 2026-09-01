import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { PublicProfile } from '@recv/shared';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { PayFlow } from '@/components/pay-flow';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function getProfile(userName: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(
      `${API_URL}/user/getProfile/${encodeURIComponent(userName)}`,
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
    getProfile(username),
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
    getProfile(username),
  ]);
  if (!bootstrap || !profile) notFound();

  const name = profile.displayName || profile.userName;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-12 sm:px-6 sm:py-16">
      <header className="flex items-center gap-4">
        {profile.avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: user-supplied remote URL
          <img
            src={profile.avatarUrl}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-surface)] text-xl font-medium"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-[color:var(--color-muted)]">Pay</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {name}
          </h1>
          <p className="text-sm text-[color:var(--color-muted)]">
            {profile.userName}.{bootstrap.domain.host}
          </p>
        </div>
      </header>
      {profile.bio ? <p className="mt-4 text-[15px]">{profile.bio}</p> : null}

      <PayFlow profile={profile} brandName={bootstrap.domain.brandName} />

      <footer className="mt-auto pt-10 text-center text-xs text-[color:var(--color-muted)]">
        {bootstrap.domain.brandName} · non-custodial · source-available
      </footer>
    </main>
  );
}
