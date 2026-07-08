#!/usr/bin/env bash
# Wrapper: ./scripts/deploy.sh  atau  ./scripts/dc.sh logs -f app
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/.env.production}"

cd "$ROOT"

if [ $# -eq 0 ]; then
	exec "${ROOT}/scripts/deploy.sh"
fi

if [ ! -f "$ENV_FILE" ]; then
	echo "Missing ${ENV_FILE} — cp .env.production.example ${ENV_FILE}" >&2
	exit 1
fi

ln -sf "$(basename "$ENV_FILE")" "${ROOT}/.env"
exec docker compose --env-file "$ENV_FILE" "$@"
