#!/usr/bin/env bash
# Puts the newest images on this server. Run in /opt/haisan (the GitHub deploy workflow does it for you):
#
#   bash deploy/deploy.sh                # pull the images named in .env and restart what changed
#   bash deploy/deploy.sh --seed         # also load the sample data (first time only)
#   bash deploy/deploy.sh --seed-demo    # the sample data plus a full-looking shop: 300 products, 900 orders (docs/demo-data.md)
#
# Before it changes anything it keeps the current images under the name ...:rollback. After it starts the new ones it
# asks the shop whether it is healthy; if it is not, it puts the old images back.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] || { echo "No .env here. Copy deploy/prod.env.example to .env and fill it in." >&2; exit 1; }

# Read only the three settings this script needs, as plain text. The file is NOT run as a shell script: a value with a
# space, <, >, & or ( ) in it (a password, a mail sender) would be taken as a command and stop the deploy. Docker
# Compose reads the whole file itself, with its own rules.
env_value() { # env_value NAME : the value after NAME=, without surrounding quotes
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']\$//"
}
API_IMAGE=$(env_value API_IMAGE)
WEB_IMAGE=$(env_value WEB_IMAGE)
DOMAIN=$(env_value DOMAIN)
for name in API_IMAGE WEB_IMAGE DOMAIN; do
  [ -n "${!name}" ] || { echo "$name is missing in .env" >&2; exit 1; }
done
export API_IMAGE WEB_IMAGE DOMAIN

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
SEED=false
SEED_DEMO=false
[ "${1:-}" = "--seed" ] && SEED=true
if [ "${1:-}" = "--seed-demo" ]; then SEED=true; SEED_DEMO=true; fi

keep() { # keep <image> : remember the image that runs now, if there is one
  if docker image inspect "$1" >/dev/null 2>&1; then docker tag "$1" "${1%%:*}:rollback"; return 0; fi
  return 1
}

HAD_API=false; HAD_WEB=false
keep "$API_IMAGE" && HAD_API=true
keep "$WEB_IMAGE" && HAD_WEB=true

echo "==> Pulling the images"
$COMPOSE pull --quiet

echo "==> Starting (the database migration runs first)"
$COMPOSE up -d --no-build --remove-orphans

if $SEED; then
  echo "==> Loading the sample data"
  $COMPOSE --profile tools run --rm seed
fi
if $SEED_DEMO; then
  echo "==> Loading the demo shop (300 products, 900 orders, reviews)"
  $COMPOSE --profile tools run --rm seed-demo
  echo "==> Restarting the API so search indexes the new products"
  $COMPOSE restart api
fi

healthy() {
  # Inside the network, through nginx, so it works before the certificate exists; then through Caddy.
  $COMPOSE exec -T nginx wget -qO- http://127.0.0.1/api/health >/dev/null 2>&1 \
    && curl -fsS -o /dev/null --max-time 10 "https://${DOMAIN}/api/health"
}

echo "==> Checking that the shop answers"
for _ in $(seq 1 30); do
  if healthy; then
    echo "The shop is up: https://${DOMAIN}"
    $COMPOSE ps --format 'table {{.Name}}\t{{.Status}}'
    exit 0
  fi
  sleep 5
done

echo "The shop did not become healthy in time." >&2
$COMPOSE logs --tail 60 api caddy >&2 || true
if $HAD_API && $HAD_WEB; then
  echo "==> Putting the previous images back" >&2
  docker tag "${API_IMAGE%%:*}:rollback" "$API_IMAGE"
  docker tag "${WEB_IMAGE%%:*}:rollback" "$WEB_IMAGE"
  $COMPOSE up -d --no-build --pull never --remove-orphans
fi
exit 1
