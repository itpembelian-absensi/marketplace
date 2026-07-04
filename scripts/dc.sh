#!/usr/bin/env bash
# Wrapper docker compose — selalu pakai .env.production
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/.env.production}"

cd "$ROOT"

if [ ! -f "$ENV_FILE" ]; then
	echo "Missing ${ENV_FILE}" >&2
	exit 1
fi

ln -sf "$(basename "$ENV_FILE")" "${ROOT}/.env"

exec docker compose --env-file "$ENV_FILE" "$@"
