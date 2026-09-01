# Platform Config Keys

**Single source of truth for every key in `core.PlatformConfig`.** Every PR that
adds, renames, or removes a key — or changes a seed value — must update this
file.

## Columns

| Column | Meaning |
|---|---|
| `Key` | Dot-namespaced, `camelCase` segments |
| `Value` | jsonb. For `IsSecret` rows: `{ "enc": "<iv>:<authTag>:<ciphertext>" }` |
| `IsSecret` | AES-256-GCM encrypted at rest with `AES_ENCRYPTION_KEY`. Never cached in Redis, never returned by the API |
| `IsPublic` | Included in `GET /config/getBootstrap` and therefore visible to browsers |
| `CacheTtlSeconds` | Redis / in-process TTL. `NULL` uses the service default |

`CHECK (NOT (IsSecret AND IsPublic))` — a key can never be both.

## Rules

- Write seed rows only through `upsertPlatformConfig` from
  `src/db/seed/seed.utils.ts`. Raw `INSERT … ON CONFLICT` is forbidden.
- `SeedUpdatedAt` must equal the unix-ms prefix of the calling seed file.
  Declare it as `const SEED_TS = …` at the top.
- Set `SeedUpdatedAt = NULL` to mark a row human-owned; seeds skip it forever.
- Never seed a real secret value. Seed the key with a placeholder and set the
  real value through the admin API or SQL at deploy time.

---

## auth

| Key | Type | Secret | Public | Default | Description |
|---|---|:-:|:-:|---|---|
| `auth.otp.codeLength` | number | | | `6` | Digits in an email OTP |
| `auth.otp.ttlSeconds` | number | | | `600` | OTP validity window |
| `auth.otp.maxVerifyAttempts` | number | | | `5` | Wrong guesses before the code is burned |
| `auth.otp.requestsPerHour` | number | | | `5` | Per-email request cap |
| `auth.nonce.ttlSeconds` | number | | | `300` | Wallet login nonce validity |
| `auth.accessToken.secret` | string | ✅ | | — | JWT signing secret, access token |
| `auth.accessToken.expiresIn` | string | | | `"15m"` | |
| `auth.refreshToken.secret` | string | ✅ | | — | JWT signing secret, refresh token |
| `auth.refreshToken.expiresIn` | string | | | `"30d"` | |

## username

| Key | Type | Secret | Public | Default | Description |
|---|---|:-:|:-:|---|---|
| `username.minLength` | number | | ✅ | `3` | Enforced client and server side |
| `username.maxLength` | number | | ✅ | `30` | |
| `username.pattern` | string | | ✅ | `"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$"` | No leading/trailing/double hyphens |
| `username.extraReserved` | string[] | | | `[]` | Runtime additions to `core.ReservedUserNames` |

## chain

RPC keys hold an **ordered fallback list**. The verifier walks the list until
one responds.

| Key | Type | Secret | Public | Default | Description |
|---|---|:-:|:-:|---|---|
| `chain.eip155.1.rpcUrls` | string[] | ✅ | | — | Ethereum mainnet |
| `chain.eip155.8453.rpcUrls` | string[] | ✅ | | — | Base |
| `chain.eip155.42161.rpcUrls` | string[] | ✅ | | — | Arbitrum One |
| `chain.eip155.137.rpcUrls` | string[] | ✅ | | — | Polygon |
| `chain.solana.mainnet.rpcUrls` | string[] | ✅ | | — | Solana |
| `chain.bip122.apiBaseUrl` | string | | | `"https://mempool.space/api"` | Bitcoin, REST |
| `chain.tron.apiBaseUrl` | string | | | `"https://api.trongrid.io"` | |
| `chain.tron.apiKey` | string | ✅ | | — | TronGrid API key |
| `chain.rpcTimeoutMs` | number | | | `10000` | Per-request timeout |

## verification

| Key | Type | Secret | Public | Default | Description |
|---|---|:-:|:-:|---|---|
| `verification.maxAttempts` | number | | | `40` | Before a job is marked failed |
| `verification.backoffSeconds` | number[] | | | `[5,10,30,60,120,300]` | Retry ladder, last value repeats |
| `verification.amountTolerance` | string | | | `"0"` | Base-unit underpayment allowance |

## payment

| Key | Type | Secret | Public | Default | Description |
|---|---|:-:|:-:|---|---|
| `payment.request.ttlMinutes` | number | | ✅ | `60` | Before a pending request expires |
| `payment.note.maxLength` | number | | ✅ | `140` | |
| `payment.allowManualTxHash` | boolean | | ✅ | `true` | Show the "already sent?" flow |
| `payment.manualTxHashMaxAgeHours` | number | | ✅ | `24` | Solana RPC history is shallow — reject older hashes with a clear message |

## mail

Novu Cloud orchestrates, Resend delivers. Provider is swappable behind
`MailerService` — see ARCHITECTURE.md §14. Resend's own credentials live in
Novu's dashboard, not here.

| Key | Type | Secret | Public | Default | Description |
|---|---|:-:|:-:|---|---|
| `mail.provider` | string | | | `"novu"` | `novu` \| `smtp` \| `ses` \| `resend` |
| `mail.novu.apiKey` | string | ✅ | | — | Novu Cloud secret key |
| `mail.novu.workflow.otp` | string | | | `"auth-otp"` | Workflow identifier |
| `mail.novu.workflow.paymentConfirmed` | string | | | `"payment-confirmed"` | |
| `mail.fromName` | string | | | `"payee.id"` | Overridden per domain |
| `mail.replyTo` | string | | | — | Optional |

The `From` address is **not** here — it comes from `Domains.MailFromAddress`,
so a `recv.to` user's OTP is sent from `recv.to`.

## feature

All public — they gate UI.

| Key | Type | Secret | Public | Default | Description |
|---|---|:-:|:-:|---|---|
| `feature.walletConnectEnabled` | boolean | | ✅ | `true` | |
| `feature.upiEnabled` | boolean | | ✅ | `false` | v2 |
| `feature.bankTransferEnabled` | boolean | | ✅ | `false` | v2 |
| `feature.signupsOpen` | boolean | | ✅ | `true` | Kill switch for username claims |

## web

| Key | Type | Secret | Public | Default | Description |
|---|---|:-:|:-:|---|---|
| `web.walletconnectProjectId` | string | | ✅ | — | Public by design |
| `web.bootstrapCacheTtlSeconds` | number | | ✅ | `300` | How long a domain edit takes to appear |
| `web.solanaRpcUrl` | string | | ✅ | `https://api.mainnet-beta.solana.com` | RPC the browser uses to build and send Solana transactions |

## rateLimit

| Key | Type | Secret | Public | Default | Description |
|---|---|:-:|:-:|---|---|
| `rateLimit.checkUsername.perMinute` | number | | | `30` | Per IP |
| `rateLimit.createRequest.perMinute` | number | | | `20` | Per IP |
| `rateLimit.submitTransaction.perMinute` | number | | | `10` | Per IP |
