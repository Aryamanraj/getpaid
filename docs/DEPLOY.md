# Deploying

Self-hosted on one server. Cloudflare for DNS. Supabase for Postgres. Redis
and both apps in Docker behind Caddy, which terminates TLS with wildcard
certificates it obtains itself over DNS-01.

```
Cloudflare DNS ──► server
                    ├── caddy   :80/:443   TLS, routes api.* → api, everything else → web
                    ├── web     :3000      Next
                    ├── api     :3001      Nest
                    └── redis   :6379      internal only
                                 │
                                 └──► Supabase Postgres
```

## 1. DNS (Cloudflare)

Per domain, two records pointing at the server's IP:

| Type | Name | Proxy |
|---|---|---|
| A | `@` | see below |
| A | `*` | see below |

`api.<domain>` is covered by the wildcard.

**Proxy (orange cloud) or not.** Caddy obtains its own certificates over
DNS-01, so the origin serves real TLS either way. If you proxy through
Cloudflare, set SSL/TLS mode to **Full (strict)**. Check that your plan allows
proxying a wildcard record; if not, grey-cloud it — everything still works,
you just lose Cloudflare's edge in front of user subdomains.

Universal SSL covers one subdomain level (`aryaman.payee.id`), never two. We
only ever issue one level — it is why usernames cannot contain dots.

## 2. Cloudflare API token

Create a token with **Zone → DNS → Edit** on `payee.id` and `recv.to`, and
nothing else. Caddy uses it to answer the DNS-01 challenge for `*.payee.id`
and `*.recv.to`. It goes in `deploy/.env.prod`, nowhere else.

## 3. Secrets

```bash
cp apps/api/env/.env.example apps/api/env/.env.production
cp deploy/.env.prod.example  deploy/.env.prod
openssl rand -hex 32          # → AES_ENCRYPTION_KEY
openssl rand -hex 24          # → REDIS_PASSWORD (same value in both files)
openssl rand -hex 24          # → ADMIN_API_KEY
```

`apps/api/env/.env.production` needs the Supabase **direct** connection
(port 5432) — the transaction-mode pooler on 6543 breaks prepared statements
and TypeORM DDL. Set `POSTGRES_SSL=true`.

**`AES_ENCRYPTION_KEY` decrypts every secret in the database.** Back it up
somewhere that is not the server. Lose it and every stored secret is gone.

## 4. First run

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
docker compose -f docker-compose.prod.yml exec api node dist/src/db/migrate
```

Migrations create the schema; seeds populate domains, chains, assets, and
config keys. Both are idempotent and safe to re-run on every deploy.

On first boot the API generates per-install JWT secrets and stores them
encrypted — you will see two `WARN` lines saying so. That is expected.

## 5. Set the secrets that live in the database

Everything except Postgres, Redis and the AES key is a `core.PlatformConfig`
row. Set the real values through the admin API (they are AES-encrypted before
they are written and can never be read back):

```bash
API=https://api.payee.id/api/v1
KEY=<ADMIN_API_KEY>

set() { curl -s -X POST $API/platformConfig/set -H "x-api-key: $KEY" \
  -H 'content-type: application/json' -d "{\"key\":\"$1\",\"value\":$2}"; echo; }

set chain.solana.mainnet.rpcUrls '["https://mainnet.helius-rpc.com/?api-key=…"]'
set chain.eip155.8453.rpcUrls    '["https://base-mainnet.g.alchemy.com/v2/…"]'
set chain.eip155.1.rpcUrls       '["…"]'
set chain.eip155.42161.rpcUrls   '["…"]'
set chain.eip155.137.rpcUrls     '["…"]'
set chain.tron.apiKey            '"…"'
set mail.novu.apiKey             '"…"'
```

The full key list is in `PLATFORM_CONFIG_KEYS.md`. Chains with no configured
RPC fall back to public endpoints — fine to test with, not to depend on.

## 6. Email (Novu Cloud + Resend)

1. In Resend, add and verify `payee.id` (SPF + DKIM records in Cloudflare).
   Check whether your plan verifies a second domain; if not, send everything
   from `payee.id` and leave `Domains.MailFromAddress` pointing there.
2. In Novu, add Resend as the email integration, then create two workflows
   with these identifiers and payloads:

   | Workflow id | Payload |
   |---|---|
   | `auth-otp` | `code`, `brandName`, `host`, `ttlMinutes` |
   | `payment-confirmed` | `brandName`, `host`, `payeeUserName`, `amountDisplay`, `assetSymbol`, `chainName`, `txHash`, `explorerUrl`, `receiptUrl`, `note` |

3. `set mail.novu.apiKey '"…"'`. Until it is set, the API logs the message it
   would have sent — the OTP code appears in the API log and nowhere else.

## 7. Adding a domain later

1. Buy it. Point `@` and `*` at the server in Cloudflare.
2. Add the token's zone permission for it.
3. Add a block to `deploy/Caddyfile` (copy the `recv.to` one) and
   `docker compose … restart caddy`.
4. `POST /admin/domains/upsert` with `host`, `brandName`, theme, and mail
   address.

No rebuild of either app.

## 8. Updating

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
docker compose -f docker-compose.prod.yml exec api node dist/src/db/migrate
```

The API refuses to start if there are unapplied migrations (rule M10), so a
missed migrate step fails loudly rather than corrupting anything.

## 9. Backups

Supabase handles Postgres. The two things only you hold are
`apps/api/env/.env.production` (the AES key) and `deploy/.env.prod`.
Redis is a cache and a queue of retryable jobs; it needs no backup.
