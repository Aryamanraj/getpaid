import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { blogEnabled, formatBlogDate, getBlogPosts } from '@/lib/blog';
import { HomeNav } from '@/components/home-nav';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getHost();
  const bootstrap = await getBootstrap(host);
  if (!bootstrap) return {};
  return {
    title: `Blog · ${bootstrap.domain.brandName}`,
    description: `News and analysis from ${bootstrap.domain.brandName}.`,
  };
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const host = await getHost();
  const bootstrap = await getBootstrap(host);
  if (!bootstrap || !blogEnabled(bootstrap, host)) notFound();

  const list = await getBlogPosts(host, page);
  if (!list) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-12 sm:px-6 sm:py-16">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight transition-colors duration-200 hover:text-[color:var(--color-muted)]"
        >
          {bootstrap.domain.brandName}
        </Link>
        <HomeNav />
      </header>

      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-1.5 text-sm text-[color:var(--color-muted)]">
        Crypto, payments, and prediction markets — published as it happens.
      </p>

      {list.items.length === 0 ? (
        <p className="mt-12 text-sm text-[color:var(--color-muted)]">
          Nothing published yet. Check back soon.
        </p>
      ) : (
        <div className="mt-8 flex flex-col divide-y divide-[color:var(--color-border)]">
          {list.items.map((post) => (
            <article key={post.slug} className="py-6 first:pt-0">
              <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-[color:var(--color-muted)] uppercase">
                {formatBlogDate(post.publishedAt)} · {post.topic}
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
                <Link
                  href={`/blog/${post.slug}`}
                  className="transition-colors duration-200 hover:text-[color:var(--color-muted)]"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--color-muted)]">
                {post.excerpt}
              </p>
            </article>
          ))}
        </div>
      )}

      {list.total > 0 && (page > 1 || list.hasMore) ? (
        <nav className="mt-8 flex items-center justify-between border-t border-[color:var(--color-border)] pt-5 font-mono text-sm">
          {page > 1 ? (
            <Link
              href={`/blog?page=${page - 1}`}
              className="text-[color:var(--color-muted)] transition-colors duration-200 hover:text-[color:var(--color-foreground)]"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {list.hasMore ? (
            <Link
              href={`/blog?page=${page + 1}`}
              className="text-[color:var(--color-muted)] transition-colors duration-200 hover:text-[color:var(--color-foreground)]"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      <footer className="mt-auto pt-12 text-xs text-[color:var(--color-muted)]">
        {bootstrap.domain.brandName} · non-custodial · source-available
      </footer>
    </main>
  );
}
