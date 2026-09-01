# getpaid — payee.id · recv.to

One link to get paid. Claim a username, add your payment details, share
`aryaman.payee.id` — anyone who opens it can pay you.

Non-custodial: funds go from payer to payee directly. We never hold keys.

> **Source-available, not open source.** Read it, audit it, run it for
> yourself — don't launch it as a service. Licensed under
> [FSL-1.1-ALv2](LICENSE.md); each release converts to Apache 2.0 after two
> years. The hosted service is, and stays, free to use.

## Status

v1 is built and verified end-to-end locally: claim a username, add a payout
address, share your link, get paid, see a verified receipt. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §16 for what's proven against a
live chain and what still needs a real transaction run through it.

| | |
|---|---|
| Chains (v1) | Ethereum, Base, Arbitrum, Polygon, Solana, Bitcoin, Tron |
| Amounts | Denominated and displayed in the asset sent. No fiat conversion |
| Auth | In-house — email OTP and wallet signature, linked to one account |
| Pay | Connect-wallet-and-pay (EVM, Solana), QR for any wallet, paste-a-hash fallback |
| Verify | Independent on-chain verification of recipient, asset, amount, confirmations |

## Layout

```
apps/api        NestJS 11 — the only thing that touches the database
apps/web        Next 15 App Router
packages/shared enums, DTO types, payment URI builders used by both
docs/           architecture, code rulebook, config key reference
```

## Getting started

```bash
make install                       # yarn workspaces
cp apps/api/env/.env.example apps/api/env/.env.development
make aes-key                       # paste into AES_ENCRYPTION_KEY
make dev-db-up                     # Redis + a local Postgres in Docker
make migrate                       # schema + seeds (chains, domains, config)
make dev-api                       # :3001, Swagger at /api
make dev-web                       # :3000
```

The local Postgres listens on `127.0.0.1:5433` (`recv`/`recv`/`recv`). For
production, point `POSTGRES_*` at your Supabase **direct** connection (port
5432) — the transaction-mode pooler on 6543 breaks prepared statements.

With no mail provider configured, the OTP code is printed in the API log.

Locally, `aryaman.localhost:3000` resolves in Chrome and Safari with no
hosts-file edit. `localhost:3000/u/aryaman` is the guaranteed fallback.

Deploying to a server: [docs/DEPLOY.md](docs/DEPLOY.md).

## Two invariants

**One build, any domain.** `payee.id` and `recv.to` are the same deployment.
Branding, theme, copy, and OG images live in `core.Domains`; a new domain is
DNS plus a row. No component hardcodes a colour or a hostname.

**Config lives in the database.** `.env` holds only Postgres credentials,
`AES_ENCRYPTION_KEY`, and Redis. RPC URLs, provider keys, JWT secrets, feature
flags, and thresholds are `core.PlatformConfig` rows — secrets AES-256-GCM
encrypted at rest, never cached in Redis, never readable back through the API.
See [docs/PLATFORM_CONFIG_KEYS.md](docs/PLATFORM_CONFIG_KEYS.md).

## Source

https://github.com/Aryamanraj/getpaid

## Contributing

Read [AGENTS.md](AGENTS.md) and [docs/CODE_RULEBOOK.md](docs/CODE_RULEBOOK.md)
first — the conventions are strict and enforced by review.
