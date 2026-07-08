#!/usr/bin/env bash
# Alias deploy — cukup: ./deploy.sh
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts/deploy.sh" "$@"
