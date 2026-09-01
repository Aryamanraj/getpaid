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

On the nginx stack (§10), pushes to `main` do this automatically (§11);
`make deploy-nginx` is the manual equivalent.

## 9. Backups

Supabase handles Postgres. The two things only you hold are
`apps/api/env/.env.production` (the AES key) and `deploy/.env.prod`.
Redis is a cache and a queue of retryable jobs; it needs no backup.

## 10. Alternative: host nginx instead of Caddy

If the server already runs nginx, skip the bundled Caddy and terminate TLS
with Cloudflare Origin Certificates instead. Same DNS records as §1, both
proxied (orange cloud), SSL/TLS mode **Full (strict)**.

Per domain:

1. In Cloudflare, generate an Origin Certificate for `<domain>, *.<domain>`
   (the wildcard hostname is required — every username lives on it). Save as
   `/etc/ssl/cloudflare/<domain>.pem` and `/etc/ssl/cloudflare/<domain>.key`.
2. Copy the matching site config from `deploy/nginx/` into
   `/etc/nginx/sites-available/`, symlink into `sites-enabled/`, then
   `sudo nginx -t && sudo systemctl reload nginx`. The config routes
   `api.<domain>` to the API on `127.0.0.1:3001` and everything else to the
   web app on `127.0.0.1:3000` — the app-level Host-header rewrite does the
   per-username routing, so no per-user nginx or DNS entries exist.

Start the stack with the override that binds both apps to loopback, naming
the services so `caddy` never starts:

```bash
docker compose -f docker-compose.prod.yml -f deploy/docker-compose.nginx.yml \
  --env-file deploy/.env.prod up -d --build web api redis
```

`ACME_EMAIL` and `CLOUDFLARE_API_TOKEN` in `deploy/.env.prod` are Caddy-only;
leave them blank. Everything else in this document is unchanged. Adding a
domain later is §7 with step 3 swapped for: new origin cert + copy a
`deploy/nginx/` config with the hostname changed.

Behind Cloudflare, `$remote_addr` in nginx logs is a Cloudflare edge IP. If
accurate client IPs matter, configure the `real_ip` module with Cloudflare's
published ranges and `CF-Connecting-IP`.

## 11. CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` deploys the nginx stack on every push to
`main` (or manually via *Run workflow*): lint, typecheck, and tests gate the
deploy; then it SSHes to the server, hard-resets the clone to `origin/main`,
and runs `deploy/deploy.sh` — build images, run migrations against the new
image (§8's rule M10 makes migrate-before-swap the safe order), swap
containers, and poll `/api/v1/health` until healthy, dumping API logs on
failure.

One-time setup:

1. Do the first deploy by hand: clone the repo on the server, complete
   §§1–6 and §10.
2. Create a deploy SSH key; the user must be able to run `docker`:

   ```bash
   ssh-keygen -t ed25519 -f deploy_key -N '' -C getpaid-deploy
   # append deploy_key.pub to ~/.ssh/authorized_keys on the server
   ```

3. In the GitHub repo, add secrets: `DEPLOY_HOST`, `DEPLOY_USER`,
   `DEPLOY_SSH_KEY` (the private key), `DEPLOY_PATH` (absolute path of the
   clone), and optionally `DEPLOY_PORT`.

The workflow never sees application secrets — env files stay on the server
and are untouched by the hard reset (they are gitignored). nginx config
changes are the one thing CI does not apply: after pulling, copy from
`deploy/nginx/` and reload nginx yourself.
