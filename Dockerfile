ARG BUN_VERSION=latest
ARG NODE_VERSION=23.9.0

FROM imbios/bun-node:${BUN_VERSION}-${NODE_VERSION}-slim AS base

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get -y update && \
    apt-get install -yq --no-install-recommends openssl ca-certificates tzdata && \
    ln -fs /usr/share/zoneinfo/Asia/Makassar /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------- #

FROM base AS deps

WORKDIR /app

RUN apt-get -y update && \
    apt-get install -yq --no-install-recommends git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.json tsconfig.build.json .swcrc nest-cli.json ./
COPY prisma prisma/

RUN bun install
# RUN bun run db:generate

# ---------------------------------------------------------------------------- #

FROM deps AS builder

WORKDIR /app

COPY . .

RUN bun run build

# ---------------------------------------------------------------------------- #

FROM base AS runner

WORKDIR /app

RUN groupadd -r appuser && useradd -r -g appuser appuser

COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

USER appuser

EXPOSE 3000

ENTRYPOINT ["bun", "dist/main.js"]