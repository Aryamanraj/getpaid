import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { ClaimForm } from '@/components/claim-form';
import { HomeNav } from '@/components/home-nav';

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="mt-1 shrink-0 text-[color:var(--color-muted)]"
      >
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}

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
        <header className="reveal">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {domain.brandName}
          </h1>
          {domain.tagline ? (
            <p className="mt-3 text-lg text-[color:var(--color-muted)]">
              {domain.tagline}
            </p>
          ) : null}
        </header>

        <div className="reveal reveal-1 mt-10">
          {features.signupsOpen === false ? (
            <p className="text-sm text-[color:var(--color-muted)]">
              Username claims are paused right now. Check back shortly.
            </p>
          ) : (
            <ClaimForm host={domain.host} />
          )}
        </div>

        <ul className="reveal reveal-2 mt-12 flex flex-col gap-3 text-sm text-[color:var(--color-muted)]">
          <Point>
            Share{' '}
            <span className="font-mono text-[color:var(--color-foreground)]">
              you.{domain.host}
            </span>{' '}
            — anyone can pay you, no account needed.
          </Point>
          <Point>
            Non-custodial. Funds go straight to your wallet; we never hold them.
          </Point>
          <Point>
            Free to use.{' '}
            <Link
              href="https://github.com/Aryamanraj/getpaid"
              className="underline underline-offset-2 transition-colors duration-200 hover:text-[color:var(--color-foreground)]"
            >
              Source-available.
            </Link>
          </Point>
        </ul>

        <div className="reveal reveal-3 mt-10 flex flex-wrap gap-1.5">
          {chains.map((c) => (
            <span
              key={c.name}
              className="rounded-full border border-[color:var(--color-border)] px-2.5 py-0.5 text-xs text-[color:var(--color-muted)]"
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
