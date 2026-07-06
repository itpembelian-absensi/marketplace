#!/bin/sh
set -e

mkdir -p \
    /app/data \
    /app/public/picture/slides \
    /app/public/picture/features \
    /app/public/picture/about \
    /app/public/picture/logo \
    /app/public/picture/products \
    /app/public/product \
    /app/public/banner \
    /app/public/profile_pictures \
    /app/public/qris

exec "$@"
