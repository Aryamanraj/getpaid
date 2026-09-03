#!/usr/bin/env bash
# Production deploy for the nginx stack. Runs on the server, from any cwd.
# Called by .github/workflows/deploy.yml after it has updated the checkout;
# safe to run by hand too.
#
# Default: pull the images CI built and pushed to GHCR — the server never
# compiles anything. `deploy.sh --build` is the fallback that builds locally
# (first-ever deploy, GHCR outage, or working without CI).
#
# Order matters either way: images first, migrate against the new image,
# then swap containers — the API refuses to start on unapplied migrations
# (rule M10), so migrating first avoids a crash-loop window.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=pull
if [ "${1:-}" = "--build" ]; then MODE=build; fi

if [ "$MODE" = "pull" ]; then
  FILES=(-f docker-compose.prod.yml -f deploy/docker-compose.nginx.yml -f deploy/docker-compose.pull.yml)
else
  FILES=(-f docker-compose.prod.yml -f deploy/docker-compose.nginx.yml)
fi

compose() {
  docker compose "${FILES[@]}" --env-file deploy/.env.prod "$@"
}

if [ "$MODE" = "pull" ]; then
  compose pull web api
else
  compose build web api
fi

compose run --rm --no-deps api node dist/src/db/migrate
compose up -d --no-build web api redis

for i in $(seq 1 30); do
  if compose exec -T api wget -qO- http://127.0.0.1:3001/api/v1/health >/dev/null 2>&1; then
    echo 'deploy ok: api healthy'
    exit 0
  fi
  echo "waiting for api on :3001 ($i/30)..."
  sleep 5
done

echo 'deploy failed: api never became healthy' >&2
compose logs --tail=100 api >&2
exit 1
