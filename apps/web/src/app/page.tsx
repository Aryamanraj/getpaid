import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { ClaimForm } from '@/components/claim-form';
import { HomeNav } from '@/components/home-nav';

export default async function HomePage() {
  const host = await getHost();
  const bootstrap = await getBootstrap(host);

  // Unknown hosts are not served. Anyone can point DNS at us; that does not
  // make it one of our domains.
  if (!bootstrap) notFound();

  const { domain, features, chains } = bootstrap;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-12 sm:px-6 sm:py-16">
      <HomeNav />
      <div className="my-auto">
        <h1 className="text-3xl font-semibold tracking-tight">
          {domain.brandName}
        </h1>
        {domain.tagline ? (
          <p className="mt-2 text-[color:var(--color-muted)]">
            {domain.tagline}
          </p>
        ) : null}

        <div className="mt-10">
          {features.signupsOpen === false ? (
            <p className="text-sm text-[color:var(--color-muted)]">
              Username claims are paused right now. Check back shortly.
            </p>
          ) : (
            <ClaimForm host={domain.host} />
          )}
        </div>

        <ul className="mt-12 flex flex-col gap-2 text-sm text-[color:var(--color-muted)]">
          <li>
            Share{' '}
            <span className="font-mono text-[color:var(--color-foreground)]">
              you.{domain.host}
            </span>{' '}
            — anyone can pay you, no account needed.
          </li>
          <li>{chains.map((c) => c.name).join(', ')}.</li>
          <li>
            Non-custodial. Funds go straight to your wallet; we never hold them.
          </li>
          <li>
            Free to use.{' '}
            <Link href="https://github.com/Aryamanraj/getpaid" className="underline">
              Source-available.
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
