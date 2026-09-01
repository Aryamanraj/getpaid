import { headers } from 'next/headers';
import type { BootstrapPayload } from '@recv/shared';
import { parseHost } from './host';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * The Domains.Host this request belongs to — always the root domain.
 * aryaman.payee.id and payee.id are the same tenant; the middleware has
 * already split off the subdomain and forwarded it as a request header.
 */
export async function getHost(): Promise<string> {
  const headerList = await headers();
  const root = headerList.get('x-recv-root-domain');
  if (root) return root;
  return parseHost(headerList.get('host') ?? 'payee.id').rootDomain;
}

/**
 * The authority on which domains exist. An unknown host returns null and the
 * caller renders a 404 — we never serve an arbitrary hostname pointed at us.
 */
export async function getBootstrap(
  host: string,
): Promise<BootstrapPayload | null> {
  try {
    const res = await fetch(
      `${API_URL}/config/getBootstrap?host=${encodeURIComponent(host)}`,
      { next: { revalidate: 300, tags: [`bootstrap:${host}`] } },
    );

    if (!res.ok) return null;

    const body = (await res.json()) as {
      success: boolean;
      data: BootstrapPayload;
    };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}
