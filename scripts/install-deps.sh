#!/usr/bin/env bash
# Deprecated — pakai ./scripts/deploy.sh (npm ci sudah di dalam Docker build).
echo "Pakai: ./scripts/deploy.sh" >&2
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy.sh" "$@"
