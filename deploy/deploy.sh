#!/usr/bin/env bash
# Production deploy for the nginx stack. Runs on the server, from any cwd.
# Called by .github/workflows/deploy.yml after it has updated the checkout;
# safe to run by hand too.
#
# Order matters: build, migrate against the new image, then swap containers —
# the API refuses to start on unapplied migrations (rule M10), so migrating
# first avoids a crash-loop window.
set -euo pipefail
cd "$(dirname "$0")/.."

compose() {
  docker compose -f docker-compose.prod.yml -f deploy/docker-compose.nginx.yml \
    --env-file deploy/.env.prod "$@"
}

compose build web api
compose run --rm --no-deps api node dist/src/db/migrate
compose up -d web api redis

for _ in $(seq 1 30); do
  if compose exec -T api wget -qO- http://127.0.0.1:3001/api/v1/health >/dev/null 2>&1; then
    echo 'deploy ok: api healthy'
    exit 0
  fi
  sleep 5
done

echo 'deploy failed: api never became healthy' >&2
compose logs --tail=100 api >&2
exit 1
