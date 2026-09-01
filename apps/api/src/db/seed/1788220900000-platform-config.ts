import type { QueryRunner } from 'typeorm';
import { upsertPlatformConfig } from './seed.utils';

const SEED_TS = 1788220900000;

/**
 * PC1 — docs/PLATFORM_CONFIG_KEYS.md is the source of truth for these keys and
 * must be updated by any PR that changes them.
 *
 * PC8 — secrets are seeded with an empty placeholder. Write the live value
 * through the admin API or SQL at deploy time; never commit one.
 */
export default async function seed(qr: QueryRunner): Promise<void> {
  const set = (
    key: string,
    value: unknown,
    description: string,
    ttl?: number,
    flags: { isSecret?: boolean; isPublic?: boolean } = {},
  ) => upsertPlatformConfig(qr, SEED_TS, key, value, description, ttl, flags);

  // ─── auth ──────────────────────────────────────────────────────────────
  await set('auth.otp.codeLength', 6, 'Digits in an email OTP');
  await set('auth.otp.ttlSeconds', 600, 'OTP validity window');
  await set(
    'auth.otp.maxVerifyAttempts',
    5,
    'Wrong guesses before the code is burned',
  );
  await set('auth.otp.requestsPerHour', 5, 'Per-email OTP request cap');
  await set('auth.nonce.ttlSeconds', 300, 'Wallet login nonce validity');
  await set(
    'auth.accessToken.secret',
    '',
    'JWT signing secret, access token',
    null,
    { isSecret: true },
  );
  await set('auth.accessToken.expiresIn', '15m', 'Access token lifetime');
  await set(
    'auth.refreshToken.secret',
    '',
    'JWT signing secret, refresh token',
    null,
    { isSecret: true },
  );
  await set('auth.refreshToken.expiresIn', '30d', 'Refresh token lifetime');

  // ─── username ──────────────────────────────────────────────────────────
  await set('username.minLength', 3, 'Minimum username length', null, {
    isPublic: true,
  });
  await set('username.maxLength', 30, 'Maximum username length', null, {
    isPublic: true,
  });
  await set(
    'username.pattern',
    '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$',
    'No leading, trailing or double hyphens',
    null,
    { isPublic: true },
  );
  await set(
    'username.extraReserved',
    [],
    'Runtime additions to core.ReservedUserNames',
  );

  // ─── chain ─────────────────────────────────────────────────────────────
  // Ordered fallback lists — the verifier walks them until one responds.
  await set(
    'chain.eip155.1.rpcUrls',
    [],
    'Ethereum mainnet RPC endpoints',
    null,
    { isSecret: true },
  );
  await set('chain.eip155.8453.rpcUrls', [], 'Base RPC endpoints', null, {
    isSecret: true,
  });
  await set(
    'chain.eip155.42161.rpcUrls',
    [],
    'Arbitrum One RPC endpoints',
    null,
    { isSecret: true },
  );
  await set('chain.eip155.137.rpcUrls', [], 'Polygon RPC endpoints', null, {
    isSecret: true,
  });
  await set(
    'chain.solana.mainnet.rpcUrls',
    [],
    'Solana RPC endpoints (Helius)',
    null,
    { isSecret: true },
  );
  await set(
    'chain.bip122.apiBaseUrl',
    'https://mempool.space/api',
    'Bitcoin REST API base',
  );
  await set(
    'chain.tron.apiBaseUrl',
    'https://api.trongrid.io',
    'TronGrid REST API base',
  );
  await set('chain.tron.apiKey', '', 'TronGrid API key', null, {
    isSecret: true,
  });
  await set('chain.rpcTimeoutMs', 10000, 'Per-request RPC timeout');

  // ─── verification ──────────────────────────────────────────────────────
  await set(
    'verification.maxAttempts',
    40,
    'Attempts before a job is marked failed',
  );
  await set(
    'verification.backoffSeconds',
    [5, 10, 30, 60, 120, 300],
    'Retry ladder; the last value repeats',
  );
  await set(
    'verification.amountTolerance',
    '0',
    'Base-unit underpayment allowance',
  );

  // ─── payment ───────────────────────────────────────────────────────────
  await set(
    'payment.request.ttlMinutes',
    60,
    'Before a pending request expires',
    null,
    { isPublic: true },
  );
  await set('payment.note.maxLength', 140, 'Payer note length cap', null, {
    isPublic: true,
  });
  await set(
    'payment.allowManualTxHash',
    true,
    'Show the "already sent?" flow',
    null,
    { isPublic: true },
  );
  await set(
    'payment.manualTxHashMaxAgeHours',
    24,
    'Solana RPC history is shallow — reject older hashes with a clear message',
    null,
    { isPublic: true },
  );

  // ─── mail ──────────────────────────────────────────────────────────────
  // Novu Cloud orchestrates, Resend delivers. Resend's own credentials live in
  // Novu's dashboard, not here.
  await set('mail.provider', 'novu', 'novu | smtp | ses | resend');
  await set('mail.novu.apiKey', '', 'Novu Cloud secret key', null, {
    isSecret: true,
  });
  await set('mail.novu.workflow.otp', 'auth-otp', 'Novu workflow identifier');
  await set(
    'mail.novu.workflow.paymentConfirmed',
    'payment-confirmed',
    'Novu workflow identifier',
  );
  await set('mail.fromName', 'payee.id', 'Overridden per domain');
  await set('mail.replyTo', '', 'Optional reply-to address');

  // ─── feature ───────────────────────────────────────────────────────────
  await set(
    'feature.walletConnectEnabled',
    true,
    'Show connect-wallet flows',
    null,
    { isPublic: true },
  );
  await set('feature.upiEnabled', false, 'v2', null, { isPublic: true });
  await set('feature.bankTransferEnabled', false, 'v2', null, {
    isPublic: true,
  });
  await set(
    'feature.signupsOpen',
    true,
    'Kill switch for username claims',
    null,
    { isPublic: true },
  );

  // ─── web ───────────────────────────────────────────────────────────────
  await set('web.walletconnectProjectId', '', 'Public by design', null, {
    isPublic: true,
  });
  await set(
    'web.bootstrapCacheTtlSeconds',
    300,
    'How long a domain edit takes to appear',
    null,
    { isPublic: true },
  );

  // ─── rateLimit ─────────────────────────────────────────────────────────
  await set('rateLimit.checkUsername.perMinute', 30, 'Per IP');
  await set('rateLimit.createRequest.perMinute', 20, 'Per IP');
  await set('rateLimit.submitTransaction.perMinute', 10, 'Per IP');
}
