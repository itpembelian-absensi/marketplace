# Stage 1: npm ci + native modules di Debian bookworm
FROM node:22-bookworm AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        ca-certificates \
        libsqlite3-dev \
        libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# sqlite3 prebuild sering ERR_DLOPEN_FAILED di Node 22 — wajib compile from source
RUN npm ci --omit=dev --foreground-scripts \
    && rm -rf node_modules/sqlite3/build \
    && npm rebuild sqlite3 --build-from-source --foreground-scripts \
    && node -e 'require("sharp"); console.log("sharp OK")' \
    && node -e 'require("sqlite3"); console.log("sqlite3 OK")'

COPY server.js ./
COPY lib ./lib
COPY public ./public

# Stage 2: runtime
FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        libsqlite3-0 \
        libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/public ./public

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:3000/api/categories" > /dev/null || exit 1

ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "server.js"]
