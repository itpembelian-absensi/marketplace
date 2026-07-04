#!/usr/bin/env bash
# Opsional: install deps di container bookworm (debug / tanpa full rebuild).
# Deploy normal: ./scripts/deploy.sh — npm ci sudah di dalam Dockerfile.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE_IMAGE="${NODE_IMAGE:-node:22-bookworm-slim}"

if ! docker info >/dev/null 2>&1; then
	echo "Docker tidak accessible." >&2
	exit 1
fi

echo "==> npm ci via ${NODE_IMAGE} (glibc bookworm — cocok untuk runtime container)"
rm -rf node_modules

docker run --rm \
	-v "$ROOT:/app" \
	-w /app \
	"$NODE_IMAGE" \
	bash -c '
		set -e
		apt-get update -qq
		apt-get install -y -qq python3 make g++ > /dev/null
		npm ci --omit=dev
		node -e "require(\"sharp\"); require(\"sqlite3\"); console.log(\"sharp + sqlite3 OK\")"
	'

echo "Selesai. node_modules siap — tapi deploy normal tidak perlu script ini."
