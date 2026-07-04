#!/bin/sh
set -e

mkdir -p \
    /app/data \
    /app/public/picture \
    /app/public/product \
    /app/public/banner \
    /app/public/profile_pictures \
    /app/public/qris

exec "$@"
