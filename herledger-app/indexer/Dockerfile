# Development-only image for `docker compose up` (see docker-compose.yml
# and apps/web/Dockerfile for the matching rationale on that image).
#
# Build context is the pnpm workspace root (herledger-app/), not this
# directory -- see apps/web/Dockerfile for why.
FROM node:22-slim

# Prisma's query engine needs libssl at runtime; node:22-slim doesn't
# include it, and its absence during `pnpm install` also makes Prisma's
# own postinstall step guess wrong about which engine variant to fetch.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY indexer/package.json indexer/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/sdk/package.json packages/sdk/package.json
# The root `postinstall` script (below) requires this file to exist before
# `pnpm install` runs -- it isn't part of the manifest-only layer above.
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "pnpm db:generate && pnpm --filter indexer dev"]
