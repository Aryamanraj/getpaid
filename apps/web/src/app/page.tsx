import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { blogEnabled } from '@/lib/blog';
import { supportHandle } from '@/components/support-card';
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
        className="mt-0.5 shrink-0 text-[color:var(--color-muted)]"
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
    <main className="bg-dots flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <span className="text-[15px] font-semibold tracking-tight">
          {domain.brandName}
        </span>
        <div className="flex items-center gap-2">
          {blogEnabled(bootstrap, domain.host) ? (
            <Link
              href="/blog"
              className="inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-medium text-[color:var(--color-muted)] transition-colors duration-200 hover:text-[color:var(--color-foreground)]"
            >
              Blog
            </Link>
          ) : null}
          <HomeNav />
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
        <h1 className="reveal text-[clamp(3.25rem,9vw,6rem)] leading-[0.95] font-semibold tracking-[-0.035em]">
          {domain.brandName}
        </h1>
        {domain.tagline ? (
          <p className="reveal reveal-1 mt-5 max-w-md text-xl text-[color:var(--color-muted)] sm:text-2xl">
            {domain.tagline}
          </p>
        ) : null}

        <div className="reveal reveal-2 mt-12 w-full">
          {features.signupsOpen === false ? (
            <p className="text-sm text-[color:var(--color-muted)]">
              Username claims are paused right now. Check back shortly.
            </p>
          ) : (
            <ClaimForm host={domain.host} />
          )}
        </div>

        <div className="reveal reveal-3 mt-14 flex flex-wrap justify-center gap-1.5">
          {chains.map((c) => (
            <span
              key={c.name}
              className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2.5 py-0.5 text-xs text-[color:var(--color-muted)]"
            >
              {c.name}
            </span>
          ))}
        </div>
      </section>

      <footer className="border-t border-[color:var(--color-border)]">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
          <ul className="grid gap-4 text-sm text-[color:var(--color-muted)] sm:grid-cols-3 sm:gap-8">
            <Point>
              Share{' '}
              <span className="font-mono text-[color:var(--color-foreground)]">
                you.{domain.host}
              </span>{' '}
              — anyone can pay you, no account needed.
            </Point>
            <Point>
              Non-custodial. Funds go straight to your wallet; we never hold
              them.
            </Point>
            <Point>
              Free to use.{' '}
              <Link
                href="https://github.com/Aryamanraj/getpaid"
                className="underline underline-offset-2 transition-colors duration-200 hover:text-[color:var(--color-foreground)]"
              >
                Source-available.
              </Link>{' '}
              {supportHandle(bootstrap) ? (
                <a
                  href={`https://${supportHandle(bootstrap)}.${domain.host}`}
                  className="font-medium text-[color:var(--color-foreground)] underline underline-offset-2 transition-colors duration-200 hover:text-[color:var(--color-muted)]"
                >
                  Support the project.
                </a>
              ) : null}
            </Point>
          </ul>
        </div>
      </footer>
    </main>
  );
}
