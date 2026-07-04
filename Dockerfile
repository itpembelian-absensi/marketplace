FROM node:22-bookworm-slim

# node_modules di-build via scripts/install-deps.sh (harus match Node 22)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY node_modules ./node_modules
COPY server.js ./
COPY lib ./lib
COPY public ./public

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:3000/api/categories" > /dev/null || exit 1

ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "server.js"]
