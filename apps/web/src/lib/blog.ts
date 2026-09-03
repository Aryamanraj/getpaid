import type {
  BlogPost,
  BlogPostList,
  BlogPostSummary,
  BootstrapPayload,
} from '@recv/shared';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** An article is public the moment the pipeline writes it; 300s revalidate
 * bounds how long a new one takes to appear here. */
const REVALIDATE = 300;

export function blogEnabled(
  bootstrap: BootstrapPayload | null,
  host: string,
): boolean {
  const hosts = bootstrap?.publicConfig?.['blog.enabledHosts'];
  return Array.isArray(hosts) && hosts.includes(host);
}

export async function getBlogPosts(
  host: string,
  page: number,
): Promise<BlogPostList | null> {
  try {
    const res = await fetch(
      `${API_URL}/blog/getPosts?host=${encodeURIComponent(host)}&page=${page}`,
      { next: { revalidate: REVALIDATE } },
    );
    const body = (await res.json()) as { success: boolean; data: BlogPostList };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

export async function getBlogFeed(
  host: string,
  limit: number,
): Promise<BlogPostSummary[] | null> {
  try {
    const res = await fetch(
      `${API_URL}/blog/getFeed?host=${encodeURIComponent(host)}&limit=${limit}`,
      { next: { revalidate: REVALIDATE } },
    );
    const body = (await res.json()) as {
      success: boolean;
      data: { items: BlogPostSummary[] };
    };
    return body.success ? body.data.items : null;
  } catch {
    return null;
  }
}

export async function getBlogPost(
  host: string,
  slug: string,
): Promise<BlogPost | null> {
  try {
    const res = await fetch(
      `${API_URL}/blog/getPost/${encodeURIComponent(slug)}?host=${encodeURIComponent(host)}`,
      { next: { revalidate: REVALIDATE } },
    );
    const body = (await res.json()) as { success: boolean; data: BlogPost };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
