#!/usr/bin/env bash
# Install npm deps so native modules (sqlite3, sharp) match the Docker runtime image.
#
# Default: npm ci inside a throwaway node:22 container (recommended).
# Optional:  INSTALL_DEPS_MODE=host ./scripts/install-deps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE_IMAGE="${NODE_IMAGE:-node:22-bookworm-slim}"
TARGET_MAJOR="$(tr -d ' \r\n' < .nvmrc 2>/dev/null || echo 22)"
MODE="${INSTALL_DEPS_MODE:-docker}"

install_host() {
	if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
		echo "Node.js/npm tidak ditemukan di host." >&2
		exit 1
	fi

	local host_major
	host_major="$(node -v | sed 's/v//' | cut -d. -f1)"
	if [ "$host_major" != "$TARGET_MAJOR" ]; then
		echo "Node host v${host_major} != runtime v${TARGET_MAJOR} — native module bisa crash di container." >&2
		echo "Pakai default: INSTALL_DEPS_MODE=docker ./scripts/install-deps.sh" >&2
		exit 1
	fi

	echo "==> npm ci (host: node $(node -v), npm $(npm -v))"
	npm ci --omit=dev
	node -e "require('sharp'); require('sqlite3'); console.log('sharp + sqlite3 OK')"
}

install_docker() {
	if ! docker info >/dev/null 2>&1; then
		echo "Docker tidak accessible — fallback ke host npm" >&2
		INSTALL_DEPS_MODE=host install_host
		return
	fi

	echo "==> npm ci via container ${NODE_IMAGE} (match runtime Node ${TARGET_MAJOR})"
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
}

case "$MODE" in
host) install_host ;;
*) install_docker ;;
esac
