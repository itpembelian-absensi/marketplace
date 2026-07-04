#!/usr/bin/env bash
# Cek prasyarat server Linux Mint 22 / Ubuntu 24.04
set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok=0
warn=0
fail=0

pass() { echo -e "${GREEN}OK${NC}   $1"; ok=$((ok + 1)); }
warn_msg() { echo -e "${YELLOW}WARN${NC} $1"; warn=$((warn + 1)); }
fail_msg() { echo -e "${RED}FAIL${NC} $1"; fail=$((fail + 1)); }

echo "=== marketplace server check (Linux Mint 22) ==="
echo

if [ -f /etc/os-release ]; then
	# shellcheck disable=SC1091
	. /etc/os-release
	echo "OS: ${PRETTY_NAME:-unknown}"
else
	warn_msg "Cannot detect OS version"
fi
echo

for cmd in git curl docker; do
	if command -v "$cmd" >/dev/null 2>&1; then
		ver=$("$cmd" --version 2>&1 | head -1)
		pass "$cmd — $ver"
	else
		fail_msg "$cmd not found"
	fi
done

if docker compose version >/dev/null 2>&1; then
	pass "docker compose — $(docker compose version --short 2>/dev/null || docker compose version | head -1)"
else
	fail_msg "docker compose plugin not found (install: sudo apt install docker-compose-v2)"
fi

if docker info >/dev/null 2>&1; then
	pass "docker daemon accessible for $(whoami)"
else
	fail_msg "docker not accessible — sudo usermod -aG docker $(whoami) && newgrp docker"
fi

check_port() {
	local port=$1 name=$2
	if ss -tln 2>/dev/null | grep -q ":${port} " || netstat -tln 2>/dev/null | grep -q ":${port} "; then
		warn_msg "Port ${port} (${name}) sudah dipakai"
	else
		pass "Port ${port} (${name}) tersedia"
	fi
}

ENV_FILE="${1:-.env.production}"
APP_PORT=5057
if [ -f "$ENV_FILE" ]; then
	APP_PORT=$(grep -E '^APP_PORT=' "$ENV_FILE" | cut -d= -f2 | tr -d '\r' || echo 5057)
fi

check_port "$APP_PORT" "marketplace app"

if [ -f "$ENV_FILE" ]; then
	pass "${ENV_FILE} exists"
	if [ ! -e .env ] || [ "$(readlink -f .env 2>/dev/null)" != "$(readlink -f "$ENV_FILE" 2>/dev/null)" ]; then
		warn_msg "Jalankan: ln -sf ${ENV_FILE} .env  (atau pakai ./scripts/dc.sh)"
	fi
	if grep -qE '^JWT_SECRET=(GANTI_|dev-secret|ganti-dengan-secret-yang-kuat$)' "$ENV_FILE"; then
		fail_msg "JWT_SECRET masih default di ${ENV_FILE}"
	fi
	if grep -q 'CHANGE_ME' "$ENV_FILE"; then
		warn_msg "Masih ada password default di ${ENV_FILE}"
	fi
else
	fail_msg "${ENV_FILE} belum ada — cp .env.production.example ${ENV_FILE}"
fi

echo
echo "Langkah deploy pertama:"
echo "  cp .env.production.example .env.production"
echo "  nano .env.production"
echo "  chmod +x scripts/*.sh"
echo "  ./scripts/deploy.sh"

echo
echo "=== Summary: ${ok} ok, ${warn} warn, ${fail} fail ==="
[ "$fail" -eq 0 ]
