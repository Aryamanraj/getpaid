import * as crypto from 'node:crypto';

/**
 * CT8 — never log a value that can be a secret or a credential. Applied to
 * every request body by LoggerMiddleware, and available to services that log
 * payloads directly.
 */
const SENSITIVE_KEYS = new Set([
  'code',
  'otp',
  'signature',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'privateKey',
  'value',
  'authorization',
]);

export function redactSensitive(input: unknown, depth = 0): unknown {
  if (depth > 6 || input === null || input === undefined) return input;

  if (Array.isArray(input))
    return input.map((item) => redactSensitive(item, depth + 1));

  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      out[key] = SENSITIVE_KEYS.has(key)
        ? '[redacted]'
        : redactSensitive(val, depth + 1);
    }
    return out;
  }

  return input;
}

/**
 * A stable, non-reversible hint for a secret an admin needs to identify but
 * must never read back. Deliberately derived from a digest, not the plaintext
 * tail — the tail of an API key is still key material.
 */
export function maskSecret(plain: string): string {
  if (!plain) return '';
  const digest = crypto.createHash('sha256').update(plain).digest('hex');
  return `••••${digest.slice(0, 4)}`;
}
