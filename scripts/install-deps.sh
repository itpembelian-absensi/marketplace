#!/usr/bin/env bash
# Install npm dependencies on the HOST (Linux server), not inside Docker build.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
	echo "Node.js/npm tidak ditemukan di host." >&2
	echo "Install Node 20, contoh:" >&2
	echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -" >&2
	echo "  sudo apt install -y nodejs" >&2
	exit 1
fi

NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 20 ] 2>/dev/null; then
	echo "Butuh Node.js 20+, saat ini: $(node -v)" >&2
	exit 1
fi

echo "==> npm ci (host: node $(node -v), npm $(npm -v))"
npm ci --omit=dev

echo "==> Verify native modules"
node -e "require('sharp'); require('sqlite3'); console.log('sharp + sqlite3 OK')"
