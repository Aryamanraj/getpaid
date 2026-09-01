# recv.to / payee.id — Architecture Plan

Open-source, free payment link service. A user claims a username, adds payment
details, and shares `aryaman.payee.id`. Anyone opening that link can pay them.

**v1 scope:** crypto only (EVM, Solana, Bitcoin, Tron). UPI and bank transfer
are modelled in the schema from day one but not implemented until v2.

Backend conventions are inherited from `closer-protocol-indexer` — see
`docs/CODE_RULEBOOK.md`. This document covers only what is specific to this
project.

---

## 1. Decisions

| Question | Decision |
|---|---|
| Repo layout | Monorepo workspaces — `apps/api` (Nest), `apps/web` (Next), `packages/shared` |
| Auth | In-house. Email OTP **and** wallet signature, both linked to one account |
| Payment confirmation | Connect-wallet-and-pay returns the tx hash; QR + manual hash entry as fallback. Backend verifies the hash on-chain |
| Chains (v1) | EVM: Ethereum, Base, Arbitrum, Polygon · Solana · Bitcoin · Tron |
| Custody | Non-custodial. Funds go payer → payee directly. We never hold keys |
| Amounts | Denominated and displayed in the asset sent. No fiat conversion in v1 |
| Domains (v1) | `payee.id` and `recv.to`. More later, without a code change |
| Package manager | Yarn workspaces |
| Licence | **FSL-1.1-ALv2** — source-available, not open source. See §15 |
| Email | Novu Cloud orchestration, Resend delivery. Both free tier |
| Multi-domain | One build, any domain. Everything domain-specific lives in the DB |
| Configuration | `core.PlatformConfig` is the source of truth. Secrets encrypted with an AES key held in `.env` |
| DB | Postgres (Supabase-hosted), TypeORM, hand-rolled migration runner |

---

## 2. Repo layout

```
recv.to/
├── apps/
│   ├── api/                        # NestJS 11
│   │   ├── config/
│   │   │   ├── configuration.ts
│   │   │   └── dotenv-options.ts
│   │   ├── env/                    # .env.development, .env.production (gitignored)
│   │   ├── src/
│   │   │   ├── app/                # app.ts (bootstrap), app.module.ts
│   │   │   ├── common/             # constants, decorators, errors, helpers,
│   │   │   │                       #   middlewares, services/, interfaces.ts
│   │   │   ├── db/                 # migrate.ts, migrations/, seed/, db.module.ts
│   │   │   ├── repo/
│   │   │   │   ├── core/           # entities/ + *-repo.service.ts
│   │   │   │   └── ops/
│   │   │   ├── platform-config/    # config + secret resolution
│   │   │   ├── domain/             # domain registry, /config/getBootstrap
│   │   │   ├── auth/               # OTP + wallet login, JWT, guards
│   │   │   ├── user/               # profile, username claim/availability
│   │   │   ├── payment-method/     # payout addresses + accepted assets
│   │   │   ├── payment/            # payment requests, receipts
│   │   │   ├── chain/              # chain registry + per-chain verifiers
│   │   │   ├── queue/              # Bull, verification retry jobs
│   │   │   ├── cache/              # Redis
│   │   │   ├── admin/
│   │   │   └── health/
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/                        # Next 15, App Router
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/
│       │   └── middleware.ts       # subdomain → /u/[username] rewrite
│       └── package.json
├── packages/
│   └── shared/                     # enums, DTO types, chain/asset registry,
│                                   #   payment URI builders. Consumed by both.
├── docs/
│   ├── ARCHITECTURE.md             # this file
│   ├── CODE_RULEBOOK.md            # ported from closer-protocol-indexer
│   └── PLATFORM_CONFIG_KEYS.md     # single source of truth for config keys
├── .claude/skills/ui-ux-pro-max/   # UI/UX design intelligence (see §10)
├── biome.json                      # one formatter/linter for the whole repo
├── Makefile
├── package.json                    # workspaces root
└── AGENTS.md
```

`packages/shared` is the reason for workspaces: the chain registry, the enum
string values, and the payment-request DTO shapes must not drift between the
Nest API and the Next app.

---

## 3. Configuration and secrets

**The rule: `.env` holds only what is needed to reach the database and decrypt
everything else.** Everything else lives in `core.PlatformConfig`, so a config
change is a SQL row, not a deploy.

### What stays in `.env`

```
NODE_ENV
PORT
POSTGRES_HOST / PORT / USER / PASSWORD / DB / SSL
AES_ENCRYPTION_KEY          # 64-char hex (32 bytes)
REDIS_HOST / PORT / PASSWORD
```

That is the whole file. RPC URLs, provider API keys, SMTP credentials, JWT
signing secrets, feature flags, thresholds, and branding all come from the DB.

### `core.PlatformConfig`

`PlatformConfigID` · `Key` (unique, dot-namespaced) · `Value` (jsonb) ·
`Description` · `IsSecret` · `IsPublic` · `CacheTtlSeconds` · `IsActive` ·
`SeedUpdatedAt` · `UpdatedBy` → Users · `CreatedAt` · `UpdatedAt`

Ported from the reference repo along with `upsertPlatformConfig` and its
`SeedUpdatedAt` conflict rules, plus two new columns:

- **`IsSecret`** — `Value` holds `{ "enc": "<iv>:<authTag>:<ciphertext>" }`,
  AES-256-GCM, produced by `AesEncryptionService` from `AES_ENCRYPTION_KEY`.
  `PlatformConfigService` decrypts transparently on read; callers never see
  ciphertext.
- **`IsPublic`** — the row is safe to ship to a browser, and is included in the
  bootstrap payload (§4).

A `CHECK` constraint enforces `NOT (IsSecret AND IsPublic)`. A secret can never
be marked public by an admin mistake.

### Caching rules

- Non-secret values: Redis, TTL from `CacheTtlSeconds`, invalidated on write.
- Secret values: **never written to Redis.** Decrypted values are held in a
  per-process in-memory map with the same TTL. Caching plaintext secrets in a
  shared store would give away most of the benefit of encrypting them at rest.

### Admin surface

`GET /admin/platformConfig/getAll` masks secret values (`••••` + last 4 of a
SHA-256 digest, never the plaintext tail). Secrets are write-only through the
API: you can set one, you cannot read one back.

### Key rotation

`make config-rotate-key` decrypts every `IsSecret` row with the old key and
re-encrypts with the new one inside a single transaction. Both keys are passed
on the command line; neither is stored.

### Bootstrap ordering

JWT secrets living in the DB means guards must read them **lazily**, not in the
constructor — a change from the reference repo, where `UserAuthGuard` caches
`ACCESS_TOKEN.SECRET` at construction. `AuthService` and the guards resolve
their secret per-request through the cached `PlatformConfigService`, so
rotation takes effect within one cache TTL and no restart.

See `docs/PLATFORM_CONFIG_KEYS.md` for the full key list.

---

## 4. Multi-domain — one build, any domain

Several domains point at the same deployment: `payee.id`, `recv.to`, and
whatever gets bought next. Adding a domain must require **DNS and a DB row —
no code change, no rebuild, no redeploy.**

### `core.Domains`

`DomainID` · `Host` (`payee.id`) · `IsActive` · `IsDefault` ·
`AliasOfDomainID` (nullable) · `BrandName` · `Tagline` · `LogoUrl` ·
`FaviconUrl` · `OgImageConfig` (jsonb) · `ThemeConfig` (jsonb) ·
`SupportEmail` · `LegalEntity` · `SocialLinks` (jsonb) · `SortOrder`

`ThemeConfig` carries colour tokens, a `fontKey`, border radius, and the
default light/dark mode. `AliasOfDomainID` marks a domain that 301s to its
target instead of rendering — for domains bought defensively.

### Namespace is global

`aryaman.payee.id` and `aryaman.recv.to` are the same user. A username is
claimed once and works on every domain. `Users.PreferredDomainID` decides the
canonical link we render, share, and put in emails.

### Request resolution

1. **Middleware** (`apps/web/src/middleware.ts`) does pure string work, no
   network call: strip the port, take the last two labels as the root domain
   (`aryaman.payee.id` → root `payee.id`, sub `aryaman`).
2. No subdomain or `www` → the claim-username page.
3. Reserved subdomain (`api`, `app`, `admin`, `docs`, `mail`, `cdn`, `status`,
   `assets`) → passthrough.
4. Anything else → rewrite to `/u/[username]`, host forwarded as a header.
5. **The page** calls `GET /config/getBootstrap?host=<host>` — the authority.
   An unknown or inactive host 404s there. Middleware never has to know which
   domains exist.

### Bootstrap payload

```jsonc
{
  "domain":  { "host", "brandName", "tagline", "logoUrl", "faviconUrl",
               "theme", "supportEmail", "socialLinks" },
  "features": { "upiEnabled": false, "walletConnectEnabled": true },
  "publicConfig": { /* every PlatformConfig row with IsPublic = true */ },
  "chains": [ /* active chains */ ],
  "assets": [ /* active assets */ ]
}
```

Cached in Redis on the API side and in Next's fetch cache with a tag, so a
domain edit propagates on the next revalidate rather than a deploy.

### Applying the theme

`ThemeConfig` colours are injected as CSS custom properties on `<html>` in the
root layout. Components only ever reference semantic tokens
(`var(--color-surface)`), never raw hex — so a new domain's palette is a DB
write.

**One honest constraint:** `next/font` is build-time only, so fonts cannot be
fully dynamic. We bundle a small allowlist of families and `ThemeConfig.fontKey`
selects among them. Adding a *new* font is the one branding change that needs a
build; colours, copy, logos, and OG images do not.

### Path fallback

`payee.id/aryaman` renders the same page as `aryaman.payee.id`. This keeps
local development, preview deploys, and link-preview crawlers working without
wildcard DNS. Locally, `aryaman.localhost:3000` also works in Chrome and Safari
with no hosts-file edit.

### DNS per domain

Wildcard `*.<domain>` and the apex point at the web app. `api.<primary domain>`
points at the Nest API. The API is deployed once and shared by every domain.

---

## 5. Data model

`core` schema for domain tables, `ops` for operational tables. PascalCase
tables and columns, `{Entity}ID` primary keys — per the rulebook.

### Identity

**`core.Users`**
`UserID` · `UserName` (unique, lowercase-normalised) · `DisplayName` ·
`Bio` · `AvatarUrl` · `PreferredDomainID` → Domains · `IsActive` ·
`CreatedAt` · `UpdatedAt`

Username rules: 3–30 chars, `[a-z0-9-]`, must start alphanumeric, no
consecutive hyphens. Stored lowercase; uniqueness enforced by
`UQ_Users_UserName` on the normalised value. Length bounds come from
PlatformConfig, not constants.

**`core.ReservedUserNames`** — `Name` · `Reason`. Blocks `api`, `app`, `admin`,
`support`, `help`, `billing`, `security`, `legal`, plus a squatting blocklist.
Seeded via migration, extendable at runtime.

**`core.AuthIdentities`** — `AuthIdentityID` · `UserID` · `Provider`
(`email` | `wallet`) · `Identifier` (email address, or wallet address) ·
`Namespace` (`eip155` | `solana`, null for email) · `IsPrimary` ·
`VerifiedAt`. `UQ_AuthIdentities_Provider_Identifier`.

One user, many identities. Sign in with email OTP, then link a wallet from the
dashboard — or vice versa. If a wallet login hits an address already linked to
another account, we refuse and tell the user to sign in with that account
instead; we never silently merge.

**`core.OtpCodes`** — `OtpCodeID` · `Email` · `CodeHash` · `ExpiresAt` ·
`ConsumedAt` · `Attempts` · `RequestIp`. Codes are hashed. TTL, code length,
attempt cap, and per-hour request cap all come from PlatformConfig.

**`core.AuthNonces`** — `AuthNonceID` · `Address` · `Namespace` · `Nonce` ·
`ExpiresAt` · `ConsumedAt`. Single-use.

**`core.RefreshTokens`** — `RefreshTokenID` · `UserID` · `TokenHash` ·
`ExpiresAt` · `RevokedAt` · `UserAgent` · `Ip`. Rotating: every refresh issues
a new token and revokes the old one. Reuse of a revoked token revokes the whole
family.

### Chain registry

**`core.Chains`** — `ChainID` · `Namespace` (`eip155`|`solana`|`bip122`|`tron`)
· `ChainRef` (`8453`, `mainnet-beta`, …) · `Name` · `Slug` · `NativeSymbol` ·
`NativeDecimals` · `ExplorerTxUrlTemplate` · `RequiredConfirmations` ·
`IsActive` · `SortOrder`.

**`core.Assets`** — `AssetID` · `ChainID` · `Symbol` · `Name` ·
`ContractAddress` (null = native coin) · `Decimals` · `LogoUrl` ·
`IsStablecoin` · `IsActive` · `SortOrder`.
`UQ_Assets_ChainID_ContractAddress`.

Both are seeded and admin-editable. Adding USDC on a new chain is a row, never
a code change. RPC URLs for a chain live in PlatformConfig as secrets, keyed by
namespace and chain ref.

### Payment configuration

**`core.PayoutAddresses`** — `PayoutAddressID` · `UserID` · `Namespace` ·
`Address` · `Label` · `IsActive`.
`UQ_PayoutAddresses_UserID_Namespace_Address`.

Keyed on namespace, not chain, because one EVM address serves Ethereum, Base,
Arbitrum, and Polygon. The user pastes it once.

**`core.AcceptedAssets`** — `AcceptedAssetID` · `UserID` · `AssetID` ·
`PayoutAddressID` · `IsActive` · `SortOrder`.
`UQ_AcceptedAssets_UserID_AssetID`.

This is the join that renders the pay page: "Aryaman accepts USDC on Base,
USDC on Arbitrum, ETH on Base, and SOL." The service layer enforces that the
address namespace matches the asset's chain namespace.

**`core.PaymentMethods`** — `PaymentMethodID` · `UserID` · `MethodType`
(`crypto-address` | `upi` | `bank-transfer`) · `Label` · `Details` (jsonb,
AES-encrypted for UPI/bank) · `IsActive` · `SortOrder`.

Crypto uses the two tables above; this table carries the v2 methods so the pay
page can render a mixed list without a schema change later.

### Payments

**`core.PaymentRequests`** — `PaymentRequestID` · `PublicID` (nanoid, used in
URLs) · `PayeeUserID` · `DomainID` (which domain it was created on) ·
`AssetID` · `ChainID` · `ToAddress` (snapshotted) · `AmountRaw`
(`numeric(78,0)`, base units) · `Note` · `PayerName` · `PayerEmail` · `Status`
(`pending`|`submitted`|`confirmed`|`failed`|`expired`) · `ExpiresAt` ·
`CreatedAt` · `UpdatedAt`.

`ToAddress` and `AmountRaw` are copied onto the request at creation. A payee
editing their address later must not change what an existing receipt says was
paid.

**No fiat anywhere.** A request for 25 USDC is created, paid, and receipted as
25 USDC. There is no price feed, no currency picker, no conversion, and nothing
that goes stale — which also means `ExpiresAt` is a housekeeping concern rather
than a financial one.

**`core.PaymentTransactions`** — `PaymentTransactionID` · `PaymentRequestID` ·
`ChainID` · `TxHash` · `FromAddress` · `ToAddress` · `AssetID` · `AmountRaw` ·
`BlockNumber` · `BlockTimestamp` · `Confirmations` · `Status`
(`pending`|`confirmed`|`failed`|`mismatched`) · `SubmittedVia`
(`wallet`|`manual`) · `RawPayload` (jsonb) · `VerifiedAt`.
`UQ_PaymentTransactions_ChainID_TxHash` — the same hash can never settle two
requests.

### Ops

**`ops.VerificationJobs`** · **`ops.VerificationAttempts`** — durable record of
each verification pass and its outcome, so a failed RPC is retried rather than
lost and a support question has an audit trail.

**`ops.AdminActionLog`** — mirrors the reference repo. Every PlatformConfig
write is logged here, with secret values redacted.

### Enums

Declared `SCREAMING_SNAKE_CASE`, values `kebab-case`, Postgres type names
`snake_case`:

`CHAIN_NAMESPACE_ENUM` · `AUTH_PROVIDER_ENUM` · `PAYMENT_METHOD_TYPE_ENUM` ·
`PAYMENT_REQUEST_STATUS_ENUM` · `TX_STATUS_ENUM` · `TX_SUBMISSION_ENUM`

---

## 6. Payment flow

```
Payer opens aryaman.payee.id
        │
        ▼
GET /config/getBootstrap?host=payee.id     → branding, theme, chains, assets
GET /profile/getByUserName/aryaman         → name, bio, avatar, accepted assets
        │
   payer picks asset + chain, enters an amount in that asset and a note
        ▼
POST /payment/createRequest
   → snapshot ToAddress and AmountRaw. Status = pending. Returns PublicID.
        │
        ├── (a) Connect wallet and pay
        │       wagmi/viem (EVM) or wallet-adapter (Solana) sends the transfer;
        │       the wallet returns a hash
        │
        └── (b) Scan QR / copy address
                QR encodes a chain-native payment URI (§7). Payer sends from
                any wallet, then pastes the hash into the page.
        │
        ▼
POST /payment/submitTransaction { publicId, txHash }
   → Status = submitted, enqueue a verification job
        │
        ▼
VerificationProcessor → ChainVerifier for the namespace
   Assert, in order:
     1. tx exists and is included in a block
     2. tx succeeded (not reverted)
     3. recipient == PaymentRequest.ToAddress
     4. asset matches (native, or the ERC-20/SPL/TRC-20 contract on AssetID)
     5. amount >= PaymentRequest.AmountRaw
     6. confirmations >= Chain.RequiredConfirmations
   Any of 3–5 failing → Status = mismatched, surfaced to the payer with the
   specific reason. 6 not yet met → re-enqueue with backoff.
        │
        ▼
Status = confirmed → receipt at /r/[publicId], payee notified
```

**Unsolicited payments.** Someone can always scan the QR from the profile page
and send without creating a request. Those are invisible to us in v1 — this is
the honest cost of skipping a chain indexer. The pay page therefore nudges
toward creating a request, and offers "already sent? paste your hash" so a
payment made out-of-band can still be attached to a receipt after the fact.

**Address ownership is self-declared.** We do not prove the payee controls the
address they pasted. A wallet linked as an auth identity is proven and gets a
"verified" badge on the pay page; a manually-typed address does not. Worth
being explicit about in the UI.

---

## 7. Payment URIs and QR codes

`packages/shared` owns the builders so the API and the web app cannot disagree.

| Chain | Native | Token |
|---|---|---|
| EVM | `ethereum:0xTO@8453?value=<wei>` | `ethereum:0xTOKEN@8453/transfer?address=0xTO&uint256=<raw>` |
| Solana | `solana:ADDR?amount=1.5` | `solana:ADDR?amount=1.5&spl-token=<mint>` |
| Bitcoin | `bitcoin:ADDR?amount=0.001` | — |
| Tron | `tron:ADDR?amount=…` | weakly supported |

Tron wallets are inconsistent about URI handling, so the Tron QR falls back to
the bare address with the amount shown as copyable text beside it.

---

## 8. Chain verifiers

One strategy per namespace, resolved by `ChainService` from `Chain.Namespace`.
Each returns the same normalised shape, so `PaymentService` has no per-chain
branching.

```ts
export interface NormalisedTransfer {
  txHash: string;
  from: string;
  to: string;
  contractAddress?: string;   // undefined for native transfers
  amountRaw: string;          // base units
  blockNumber: number;
  blockTimestamp: number;
  confirmations: number;
  succeeded: boolean;
}
```

Every verifier is a Nest service returning `Promise<ResultWithError>` and is
called through `Promisify<NormalisedTransfer>` — same contract as everything
else.

| Namespace | Library / source | Notes |
|---|---|---|
| `eip155` | `ethers` v6, JSON-RPC | One verifier, four chains. Token transfers read from the `Transfer` log, not calldata — that survives transfers made through routers and smart accounts |
| `solana` | `@solana/web3.js` | `getTransaction` with `maxSupportedTransactionVersion: 0`; SPL amounts from `meta.preTokenBalances` / `postTokenBalances` deltas rather than instruction parsing |
| `bip122` | mempool.space or Blockstream REST | No RPC node. Sum all vouts paying the address — a single tx can pay it more than once |
| `tron` | TronGrid REST | TRC-20 transfers come from the event log; TRX from the raw contract |

Endpoints and provider keys come from PlatformConfig as secrets, one key per
chain holding an ordered fallback list. A dead provider is a DB write.

Amounts are `bignumber.js` throughout and cross the wire as strings. No
JavaScript number ever touches a token amount.

---

## 9. Auth

**Email OTP**
`POST /auth/requestOtp { email }` → hash and store a code, send mail. Always
returns success regardless of whether the email exists, so the endpoint cannot
be used to enumerate accounts.
`POST /auth/verifyOtp { email, code }` → create the user if new, issue tokens.

**Wallet**
`GET /auth/getNonce?address=&namespace=` → single-use nonce with a human-
readable SIWE-style message that names the domain the user is on.
`POST /auth/walletLogin { address, namespace, signature }` → verify
(`ethers.verifyMessage` for EVM, `tweetnacl` for Solana), issue tokens.

**Tokens.** JWT access token, 15 min, `Authorization: Bearer`. Refresh token,
30 days, rotating, stored hashed, returned in the body and held by the web app
in `localStorage`. Reuse of a rotated refresh token revokes its whole family.
Signing secrets live in PlatformConfig, encrypted, read lazily (§3); a fresh
install generates per-install secrets on first boot.

*Why not an httpOnly cookie:* the API is shared by every domain, and a cookie
scoped to `api.payee.id` is never sent from `recv.to`. Header transport is the
only option that keeps "one API, any domain" true. The trade-off is XSS
exposure, mitigated by never rendering user-supplied markup anywhere.

**Guards.** `UserAuthGuard`, `OptionalAuthGuard`, `AdminAuthGuard` — ported
from the reference repo, with `@ApiBearerAuth('JWT-auth')` / `'Api-auth'` as
the rulebook requires.

---

## 10. Frontend

Next 15 App Router, Tailwind, minimal. Server components for the profile page
so it renders fast and previews well when the link is pasted into a chat.

Design work goes through the **`ui-ux-pro-max`** skill in
`.claude/skills/ui-ux-pro-max/` — its `scripts/search.py` carries style,
palette, typography, icon, and UX-guideline data. Run `--design-system` once to
set the overall direction, then per-domain queries for individual screens. The
pay page is a trust surface, so accessibility and touch-target rules
(priorities 1–2 in that skill) are non-negotiable.

| Route | Purpose |
|---|---|
| `/` (root domain) | Claim your username. Single input, live availability check, then sign in |
| `/login` | Email OTP or connect wallet |
| `/dashboard` | Accepted assets, payout addresses, payment history |
| `/dashboard/profile` | Display name, bio, avatar, preferred domain |
| `/u/[username]` | The pay page — rewritten from the subdomain |
| `/r/[publicId]` | Receipt, shareable, works signed out |

The pay page is the product. One column: who you are paying, what they accept,
an amount field, one primary button. No chrome, no marketing, no cookie banner.

All colour, radius, and font choices resolve through CSS custom properties fed
by `Domains.ThemeConfig` (§4). No component hardcodes a hex value — that is
what makes a new domain a DB row.

**Wallet connection.** wagmi + viem + a connect modal for EVM;
`@solana/wallet-adapter` for Solana. Bitcoin and Tron are QR + manual hash —
their connect standards are not worth the dependency weight in v1. The
WalletConnect project ID is a public PlatformConfig key.

**Link previews.** `generateMetadata` per profile, with the OG image template
taken from the domain record, so `aryaman.payee.id` and `aryaman.recv.to`
unfurl with their own branding.

---

## 11. Security notes

- **Rate limits** on `requestOtp`, `verifyOtp`, `getNonce`, `createRequest`,
  and `checkUsername`, keyed on IP and on identifier. Limits from
  PlatformConfig.
- **Address validation** at input: EIP-55 checksum for EVM, base58 + curve
  check for Solana, bech32/base58 for Bitcoin, base58 + checksum for Tron. A
  typo'd address means permanently lost funds.
- **No replay** — `UQ_PaymentTransactions_ChainID_TxHash`.
- **Trust display.** Only user-entered data ever renders on a pay page. Bio and
  display name are escaped and length-capped; no HTML, no links in bio in v1.
  A payment page that renders an attacker's markup is a phishing vector.
- **Enumeration.** Username availability is public by design; OTP request is
  not. Keep them on different response shapes.
- **`AES_ENCRYPTION_KEY` is the crown jewel.** It decrypts every secret in the
  DB. It is the one value that must never be in the database, in git, or in a
  log line. Rotation procedure in §3.

---

## 12. Supabase notes

Postgres only — no Supabase Auth, no RLS, no PostgREST. The Nest API is the
only thing that touches the database.

Use the **direct connection** (port 5432) for migrations. The transaction-mode
pooler (6543) breaks prepared statements and TypeORM's DDL. The app itself can
use the session pooler.

---

## 13. Deployment

Self-hosted on a single server. Cloudflare for DNS. Redis in Docker alongside
the API. Postgres on Supabase.

```
Cloudflare  ──►  server
                  ├── Caddy / nginx      TLS termination, reverse proxy
                  ├── web    (Next)      :3000
                  ├── api    (Nest)      :3001
                  └── redis  (Docker)    :6379, bound to 127.0.0.1
                             │
                             └──► Supabase Postgres (external)
```

### Cloudflare DNS

Per domain: a wildcard `*.<domain>` and an apex record pointing at the server,
plus `api.payee.id` for the Nest API.

Two things to check in the dashboard before relying on this:

1. **Proxying a wildcard record.** Confirm the orange cloud is available for
   `*.payee.id` on your plan. If it is not, grey-cloud the wildcard and
   terminate TLS at the origin — everything below still works.
2. **Certificate coverage.** Universal SSL covers the apex and *one* level of
   subdomain, so `aryaman.payee.id` is fine and `a.b.payee.id` is not. We only
   ever issue one level, so this is not a constraint in practice — but it is
   the reason usernames can't contain dots.

### TLS at the origin

**Caddy is the recommendation** over nginx here, purely because of the
wildcard: with the Cloudflare DNS plugin it obtains and renews a
`*.payee.id` + `*.recv.to` certificate over DNS-01 automatically, using a
scoped Cloudflare API token. nginx (as in the reference repo) needs certbot
with a DNS-01 hook wired up by hand. Either works; Caddy is less to maintain.

The Cloudflare API token needs `Zone:DNS:Edit` on those two zones and nothing
else.

### Redis

Docker, published only on `127.0.0.1`, with a password from `.env`. It holds
the PlatformConfig cache, the bootstrap cache, rate-limit counters, and Bull
queues. Nothing in Redis is authoritative — a flush costs a cold cache, not
data. Secrets are never written to it (§3).

### Process management

`docker-compose.prod.yml` runs Caddy (built with the Cloudflare DNS plugin),
the API, the web app, and Redis. `deploy/Caddyfile` holds one block per
domain. Step-by-step in `docs/DEPLOY.md`. Zero-downtime is not a v1 concern.

### RPC providers

| Chain | Provider | Notes |
|---|---|---|
| Solana | **Helius free tier** | Confirmed. Watch the request-rate cap under the verification retry ladder |
| EVM ×4 | **not yet chosen** | Helius is Solana-only. See below |
| Bitcoin | mempool.space public API | Rate-limited but adequate; no key |
| Tron | TronGrid | Free API key |

**Gap to close:** Ethereum, Base, Arbitrum, and Polygon still need an endpoint.
One Alchemy free-tier account covers all four and is the least effort. Failing
that, the seed can ship public endpoints (`mainnet.base.org`,
`arb1.arbitrum.io/rpc`, `polygon-rpc.com`, a public Ethereum endpoint) as the
fallback list — usable to build against, not something to depend on in
production. Either way the URLs are a PlatformConfig secret, so swapping
providers later is a DB write.

**One constraint worth designing around:** Solana RPC nodes retain only recent
transaction history, and deep history is a paid archival feature. Verification
normally runs seconds after payment, so this never bites — but the "already
sent? paste your hash" flow could be handed a week-old signature that no longer
resolves. Cap manual hash entry to a recent window (a PlatformConfig key) and
give a clear message rather than a confusing failure.

---

## 14. Email

Two messages in v1 — the OTP code and a payment-confirmed notice. The OTP is
the highest-stakes message in the product: if it is slow or lands in spam,
login is broken.

**Stack: Novu Cloud for orchestration, Resend for delivery.** Both managed,
both free tier at our volume. Novu owns the workflow (trigger, template,
retry, and later a second channel); Resend is configured as Novu's email
integration and owns deliverability, bounces, and complaints.

This is a better shape than self-hosted Novu (no MongoDB, no services to run)
or raw Workspace SMTP (real per-message logs and a sender reputation built for
transactional mail).

### In the codebase

A single `MailerService` behind an interface, with the concrete provider chosen
by the `mail.provider` PlatformConfig key — `novu` in v1. Nothing else in the
codebase knows how mail is sent, so swapping delivery later is a config change.

`MailerService` triggers a Novu workflow by ID with a typed payload. Payload
shapes live in `packages/shared` and are versioned with the code; the templates
themselves live in Novu's dashboard.

**One consequence of that worth naming:** email templates are then *not* in the
repo, which slightly undercuts the "audit everything" goal (§15). Mitigation is
cheap — keep a copy of each template's markup in `docs/email-templates/` and
treat Novu as the renderer, not the source of truth.

### DNS and domains

Resend needs SPF and DKIM records in Cloudflare for each sending domain.
`Domains.MailFromAddress` makes the sender per-domain, so a `recv.to` user's
OTP comes from `recv.to`.

**Check before relying on it:** Resend's free tier caps custom domains (and
sits around 3,000 emails/month with a daily cap). If two verified domains
aren't available on the free plan, send everything from `payee.id` in v1 and
leave `MailFromAddress` pointing there for both — the column already supports
splitting them the day the plan allows.

## 15. Licensing

**Decided: FSL-1.1-ALv2** (Functional Source License, Apache 2.0 future
licence). `LICENSE.md` holds the canonical text from fsl.software.

Anyone may read, audit, modify, contribute, and self-host the code for their
own use. Nobody may offer it as a competing service. Each release converts to
Apache 2.0 on its second anniversary.

This fits the goal exactly: for a payments product, public auditability is the
whole point of publishing — users need to see that we never touch their keys —
and the two-year conversion is a genuine good-faith signal rather than a
permanent enclosure.

### The wording matters

**This is not open source, and the project must not describe itself that way.**
Every OSI-approved licence, AGPL included, permits a competing commercial
service; that is what "open source" means to the people who care about the
term, and claiming it while restricting use reliably starts a fight that costs
more goodwill than the label is worth.

Use **"source-available"** in the README, on the landing page, and in any
launch post. The plain-English line to pair with it:

> Source-available, not open source: read it, audit it, run it for yourself —
> don't launch it as a service.

"Completely free to use" remains true and is worth keeping, because it
describes the hosted service, which is the thing users actually consume.

### Still to do

`LICENSE.md` carries a `<LICENSOR NAME — fill this in>` placeholder. It needs
the legal entity that owns the copyright — your name, or a company if one
exists. That is the one field I shouldn't guess.

## 16. Phases

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Workspace, biome, Makefile, env, licence, migration runner, AES, PlatformConfig, Domains + bootstrap, health | done |
| 1 | Auth — email OTP + wallet, JWT, guards. Username claim and availability | done |
| 2 | Chain and asset registry, seeded. Payout addresses and accepted assets | done |
| 3 | Public profile page, subdomain routing, theming from DB, payment requests, QR codes | done |
| 4 | Verification — EVM, Solana, Bitcoin, Tron | done · EVM verified against a live Base transfer; Solana/Bitcoin/Tron written against their APIs, not yet exercised end-to-end |
| 5 | Receipts, email notifications, payee payment history | done · mail fires through the Novu path, logged until a key is set |
| 6 | Admin surface for domains, config, chains, assets, verification jobs | done (API only, no UI) |
| 7 | Deployment — Caddy, Cloudflare wildcard TLS, docker compose | done · not yet run on a real server |
| 8 | UPI and bank transfer | not started (v2) |

The verification queue is `ops.VerificationJobs` polled every 5 seconds by
`@nestjs/schedule` — durable, auditable, and no Bull dependency. Bull can
replace it later if throughput ever demands it.

## 17. Open questions

1. **Licensor name** — the copyright holder for `LICENSE.md` (§15).
2. **EVM RPC** — public endpoints are seeded as fallbacks and work; an Alchemy
   key makes them dependable (§13).
3. **Resend free-tier domain cap** — whether both domains can be verified, or
   v1 sends everything from `payee.id` (§14).
4. **Solana / Bitcoin / Tron verifiers** — written against documented API
   shapes; each needs one real transaction run through it before launch.
5. **Admin UI** — the admin API exists; a UI is a v1.1 item.
