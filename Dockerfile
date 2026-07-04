FROM node:20.20.2-bookworm-slim

# Native deps untuk sqlite3 + sharp; reinstall npm jika image/cache corrupt
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@10.9.4 \
    && npm cache clean --force

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN node -e "require('sharp'); require('sqlite3')"

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
