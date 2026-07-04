#!/usr/bin/env bash
# Satu perintah: pull kode terbaru + build image + restart container.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
BRANCH="${BRANCH:-main}"

if [ ! -f "$ENV_FILE" ]; then
	echo "Missing ${ENV_FILE} — jalankan: cp .env.production.example ${ENV_FILE}" >&2
	exit 1
fi

ln -sf "$(basename "$ENV_FILE")" .env

echo "==> Sync code"
if [ -d .git ] && git remote get-url origin >/dev/null 2>&1; then
	git fetch origin "$BRANCH"
	if [ -n "${GIT_SHA:-}" ]; then
		git reset --hard "$GIT_SHA"
	else
		git reset --hard "origin/${BRANCH}"
	fi
else
	echo "    Skip git pull (bukan repo git atau belum ada remote)"
fi

echo "==> Prepare storage"
mkdir -p \
	storage/data \
	storage/uploads/picture \
	storage/uploads/product \
	storage/uploads/banner \
	storage/uploads/profile_pictures \
	storage/uploads/qris

# Migrasi data lama (dev lokal tanpa Docker) → storage Docker
if [ -f data/marketplace.db ] && [ ! -f storage/data/marketplace.db ]; then
	echo "    Memindahkan data/marketplace.db → storage/data/"
	cp -a data/marketplace.db storage/data/marketplace.db
fi

for dir in picture product banner profile_pictures qris; do
	src="public/${dir}"
	dst="storage/uploads/${dir}"
	if [ -d "$src" ] && [ -n "$(ls -A "$src" 2>/dev/null)" ]; then
		echo "    Sync upload: ${src} → ${dst}"
		cp -an "$src"/. "$dst"/ 2>/dev/null || true
	fi
done

echo "==> Build & start containers (npm ci di dalam Docker — match glibc bookworm)"
docker compose --env-file "$ENV_FILE" build --no-cache
docker compose --env-file "$ENV_FILE" up -d --remove-orphans

APP_PORT="$(grep -E '^APP_PORT=' "$ENV_FILE" | cut -d= -f2 | tr -d '\r' | tr -d ' ')"
APP_PORT="${APP_PORT:-5057}"

echo "==> Health check (http://127.0.0.1:${APP_PORT}/api/categories)"
for i in $(seq 1 12); do
	if curl -fsS "http://127.0.0.1:${APP_PORT}/api/categories" > /dev/null; then
		echo "Deploy OK — marketplace jalan di port ${APP_PORT}"
		exit 0
	fi
	echo "    Menunggu app... (${i}/12)"
	sleep 5
done

echo "Health check gagal pada port ${APP_PORT}" >&2
echo "Cek log: ./scripts/dc.sh logs --tail 80 app" >&2
docker compose --env-file "$ENV_FILE" logs --tail 80 app >&2 || true
exit 1
