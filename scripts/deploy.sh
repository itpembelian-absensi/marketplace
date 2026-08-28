#!/usr/bin/env bash
# Satu perintah deploy — handle git, cleanup, build Docker, health check.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
BRANCH="${BRANCH:-main}"
FORCE_REBUILD="${FORCE_REBUILD:-1}"

log() { echo "==> $*"; }
warn() { echo "!!  $*" >&2; }
die() {
	echo "::error::$*" >&2
	echo "ERROR: $*" >&2
	exit 1
}

annotate_disk() {
	df -h | while IFS= read -r line; do echo "::error::df ${line}" >&2; done
	docker system df 2>/dev/null | while IFS= read -r line; do echo "::error::docker-df ${line}" >&2; done
}

compose() {
	docker compose --env-file "$ENV_FILE" "$@"
}

# --- Preflight ---
if ! command -v docker >/dev/null 2>&1; then
	die "Docker tidak terinstall (sudo apt install docker.io docker-compose-v2)"
fi

if ! docker compose version >/dev/null 2>&1; then
	die "Plugin docker compose tidak ditemukan"
fi

docker_ok=0
for i in 1 2 3 4 5; do
	if docker info >/dev/null 2>&1; then
		docker_ok=1
		break
	fi
	warn "docker info gagal (percobaan ${i}/5)"
	sleep 2
done
if [ "$docker_ok" != "1" ]; then
	docker info >&2 || true
	id >&2 || true
	ls -l /var/run/docker.sock >&2 || true
	die "Docker tidak accessible — jalankan: sudo usermod -aG docker \$USER && newgrp docker"
fi

if [ ! -f "$ENV_FILE" ]; then
	if [ -f .env.production.example ]; then
		log "Buat ${ENV_FILE} dari .env.production.example"
		cp .env.production.example "$ENV_FILE"
		warn "Edit ${ENV_FILE} — ganti JWT_SECRET dan SEED_ADMIN_PASSWORD sebelum production!"
	else
		die "File ${ENV_FILE} tidak ada"
	fi
fi

ln -sf "$(basename "$ENV_FILE")" .env

if grep -qE '^JWT_SECRET=(ganti-dengan|GANTI_|dev-secret)' "$ENV_FILE" 2>/dev/null; then
	warn "JWT_SECRET masih default di ${ENV_FILE}"
fi

chmod +x scripts/*.sh 2>/dev/null || true
[ -f docker/entrypoint.sh ] && chmod +x docker/entrypoint.sh

# --- Git: hard reset (tanpa konflik pull) ---
# CI sudah git reset --hard sebelum menjalankan script ini.
if [ -n "${GIT_SHA:-}" ]; then
	log "Skip git sync (workflow sudah di $(git rev-parse --short HEAD 2>/dev/null || echo unknown))"
elif [ -d .git ] && git remote get-url origin >/dev/null 2>&1; then
	log "Sync code → origin/${BRANCH}"
	rm -f .git/index.lock .git/HEAD.lock
	git fetch origin "$BRANCH"
	if [ -n "${GIT_SHA:-}" ]; then
		git reset --hard "$GIT_SHA"
	else
		git reset --hard "origin/${BRANCH}"
	fi
	# Buang file sampah lokal, jaga data production
	git clean -fd \
		-e storage \
		-e .env.production \
		-e .env \
		-e node_modules 2>/dev/null || true
else
	warn "Skip git sync (bukan repo git / belum ada remote)"
fi

# --- Sync package-lock.json (supaya npm ci di Docker tidak gagal) ---
if command -v npm >/dev/null 2>&1; then
	log "Sync package-lock.json → npm install --package-lock-only"
	npm install --package-lock-only 2>&1 || warn "npm install --package-lock-only gagal (lanjut)"
else
	warn "npm tidak ditemukan di host — skip lock file sync"
fi

# --- node_modules host = sumber crash glibc ---
if [ -d node_modules ]; then
	log "Hapus node_modules di host (deps hanya di-build di dalam Docker)"
	rm -rf node_modules || warn "Gagal hapus node_modules (lanjut)"
fi

# --- Storage ---
log "Prepare storage"
mkdir -p \
	storage/data \
	storage/uploads/picture/slides \
	storage/uploads/picture/features \
	storage/uploads/picture/about \
	storage/uploads/picture/logo \
	storage/uploads/picture/products \
	storage/uploads/picture/brands \
	storage/uploads/product \
	storage/uploads/banner \
	storage/uploads/profile_pictures \
	storage/uploads/qris

if [ -f data/marketplace.db ] && [ ! -f storage/data/marketplace.db ]; then
	log "Migrasi data/marketplace.db → storage/data/"
	cp -a data/marketplace.db storage/data/marketplace.db
fi

for dir in picture product banner profile_pictures qris; do
	src="public/${dir}"
	dst="storage/uploads/${dir}"
	if [ -d "$src" ] && [ -n "$(ls -A "$src" 2>/dev/null)" ]; then
		cp -an "$src"/. "$dst"/ 2>/dev/null || true
	fi
done

# --- Docker ---
log "Stop container lama"
compose down --rmi local --remove-orphans 2>/dev/null || true

APP_IMAGE="${COMPOSE_PROJECT_NAME:-marketplace}-app:latest"
if [ -f "$ENV_FILE" ]; then
	pname="$(grep -E '^COMPOSE_PROJECT_NAME=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '\r' | tr -d ' ' || true)"
	[ -n "${pname:-}" ] && APP_IMAGE="${pname}-app:latest"
fi
log "Hapus image ${APP_IMAGE} dan cache Docker yang tidak terpakai"
docker rmi "$APP_IMAGE" 2>/dev/null || true
docker container prune -f >/dev/null 2>&1 || true
docker builder prune -af >/dev/null 2>&1 || true
docker image prune -af >/dev/null 2>&1 || true
df -h || true

BUILD_LOG="$(mktemp)"
trap 'rm -f "$BUILD_LOG"' EXIT

BUILD_ARGS=(build --progress=plain)
if [ "$FORCE_REBUILD" = "1" ]; then
	log "Build image --no-cache --pull (npm ci di Docker bookworm, tunggu 2-5 menit)"
	BUILD_ARGS+=(--no-cache --pull)
else
	log "Build image (pakai cache Docker, tanpa pull base image)"
fi

if ! compose "${BUILD_ARGS[@]}" 2>&1 | tee "$BUILD_LOG"; then
	warn "Build gagal. Log terakhir:"
	tail -50 "$BUILD_LOG" >&2
	tail -20 "$BUILD_LOG" | while IFS= read -r line; do
		echo "::error::${line}" >&2
	done
	annotate_disk
	df -h >&2 || true
	die "Docker build gagal — biasanya disk penuh (WORKDIR /app gagal)"
fi

log "Start container"
if ! compose up -d --remove-orphans; then
	compose logs --tail 80 app >&2 || true
	compose ps >&2 || true
	df -h >&2 || true
	die "docker compose up gagal"
fi

APP_PORT="$(grep -E '^APP_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '\r' | tr -d ' ' || true)"
APP_PORT="${APP_PORT:-5057}"

log "Health check http://127.0.0.1:${APP_PORT}/api/categories"
for i in $(seq 1 18); do
	if curl -fsS "http://127.0.0.1:${APP_PORT}/api/categories" > /dev/null 2>&1; then
		log "Deploy OK — http://127.0.0.1:${APP_PORT}"
		compose ps
		exit 0
	fi

	# Kalau container crash loop, stop lebih cepat
	if ! compose ps --status running 2>/dev/null | grep -q app; then
		STATUS="$(compose ps --format '{{.Status}}' app 2>/dev/null || echo unknown)"
		if echo "$STATUS" | grep -qiE 'restart|exit'; then
			warn "Container tidak healthy (status: ${STATUS})"
			compose logs --tail 60 app >&2 || true
			die "Container crash — lihat log di atas"
		fi
	fi

	echo "    Menunggu... (${i}/18)"
	sleep 5
done

warn "Health check timeout"
df -h >&2 || true
compose ps >&2 || true
compose logs --tail 80 app >&2 || true
die "App tidak merespons di port ${APP_PORT}"
