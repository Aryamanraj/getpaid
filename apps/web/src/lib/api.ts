import type { ApiResponse } from '@recv/shared';
import { parseHost } from './host';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const ACCESS_KEY = 'recv.accessToken';
const REFRESH_KEY = 'recv.refreshToken';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Tokens travel in the Authorization header rather than cookies. The API is
 * shared by every domain, and a cookie scoped to api.payee.id is never sent
 * from recv.to — so the header is the only option that keeps "one API, any
 * domain" true. The trade-off is XSS exposure, mitigated by never rendering
 * user-supplied markup anywhere.
 */
export const tokenStore = {
  get access(): string | null {
    try {
      return localStorage.getItem(ACCESS_KEY);
    } catch {
      return null;
    }
  },
  get refresh(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set(access: string, refresh: string) {
    try {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
      window.dispatchEvent(new Event('recv:auth'));
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      window.dispatchEvent(new Event('recv:auth'));
    } catch {}
  },
};

/** The Domains.Host the API should treat this request as belonging to. */
export function currentHost(): string {
  if (typeof window === 'undefined') return 'payee.id';
  return parseHost(window.location.host).rootDomain;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
}

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refresh = tokenStore.refresh;
      if (!refresh) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        const json = (await res.json()) as ApiResponse<{
          tokens: { accessToken: string; refreshToken: string };
        }>;
        if (!json.success) {
          tokenStore.clear();
          return false;
        }
        tokenStore.set(
          json.data.tokens.accessToken,
          json.data.tokens.refreshToken,
        );
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function api<T>(
  path: string,
  { method = 'GET', body, auth = false, retry = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth) {
    const token = tokenStore.access;
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && auth && retry && (await refreshTokens())) {
    return api<T>(path, { method, body, auth, retry: false });
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }

  if (!json.success) {
    if (res.status === 401 && auth) tokenStore.clear();
    throw new ApiError(json.message ?? 'Request failed', res.status);
  }
  return json.data;
}
