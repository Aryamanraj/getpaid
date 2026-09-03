import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getBootstrap, getHost } from '@/lib/bootstrap';
import { blogEnabled, formatBlogDate, getBlogPost } from '@/lib/blog';
import { SupportCard, supportHandle } from '@/components/support-card';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const host = await getHost();
  const [bootstrap, post] = await Promise.all([
    getBootstrap(host),
    getBlogPost(host, slug),
  ]);
  if (!bootstrap || !post) return {};
  return {
    title: `${post.title} · ${bootstrap.domain.brandName}`,
    description: post.metaDescription || post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
      types: { 'application/rss+xml': '/blog/rss.xml' },
    },
    openGraph: {
      title: post.title,
      description: post.metaDescription || post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      siteName: bootstrap.domain.brandName,
      images: post.heroImageUrl ? [{ url: post.heroImageUrl }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const host = await getHost();
  const bootstrap = await getBootstrap(host);
  if (!bootstrap || !blogEnabled(bootstrap, host)) notFound();

  const post = await getBlogPost(host, slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    image: post.heroImageUrl ? [post.heroImageUrl] : undefined,
    mainEntityOfPage: `https://${host}/blog/${post.slug}`,
    author: { '@type': 'Organization', name: bootstrap.domain.brandName },
    publisher: {
      '@type': 'Organization',
      name: bootstrap.domain.brandName,
      url: `https://${host}`,
    },
    keywords: post.tags.join(', '),
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-12 sm:px-6 sm:py-16">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: first-party JSON-LD, serialised from our own data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="flex items-center justify-between">
        <Link
          href="/blog"
          className="text-sm text-[color:var(--color-muted)] transition-colors duration-200 hover:text-[color:var(--color-foreground)]"
        >
          ← Blog
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight transition-colors duration-200 hover:text-[color:var(--color-muted)]"
        >
          {bootstrap.domain.brandName}
        </Link>
      </nav>

      <article className="mt-10">
        <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-[color:var(--color-muted)] uppercase">
          {formatBlogDate(post.publishedAt)} · {post.topic}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {post.title}
        </h1>

        {post.heroImageUrl ? (
          // biome-ignore lint/performance/noImgElement: pipeline-supplied remote URL
          <img
            src={post.heroImageUrl}
            alt=""
            className="mt-6 w-full rounded-[var(--radius)] border border-[color:var(--color-border)]"
          />
        ) : null}

        <div className="prose mt-8">
          <Markdown remarkPlugins={[remarkGfm]}>{post.bodyMarkdown}</Markdown>
        </div>

        {post.sources.length > 0 ? (
          <footer className="mt-10 border-t border-[color:var(--color-border)] pt-5">
            <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-[color:var(--color-muted)] uppercase">
              Sources
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {post.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="text-[color:var(--color-muted)] underline underline-offset-2 transition-colors duration-200 hover:text-[color:var(--color-foreground)]"
                  >
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ul>
          </footer>
        ) : null}

        {supportHandle(bootstrap) ? (
          <SupportCard
            handle={supportHandle(bootstrap) as string}
            host={host}
            brandName={bootstrap.domain.brandName}
          />
        ) : null}
      </article>

      <footer className="mt-auto pt-12 text-xs text-[color:var(--color-muted)]">
        {bootstrap.domain.brandName} · non-custodial · source-available
      </footer>
    </main>
  );
}
