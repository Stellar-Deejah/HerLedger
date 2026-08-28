# Development-only image for `docker compose up` (see docker-compose.yml).
# Not used for production builds -- there is no multi-stage/production
# target here on purpose (see the "Docker Compose" section of README.md
# for why: source is bind-mounted for hot reload, which is the opposite of
# a production image's immutable-layer model).
#
# Build context is the pnpm workspace root (herledger-app/), not this
# directory, so the workspace's other packages (packages/config,
# packages/sdk) resolve correctly during install.
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

EXPOSE 3000

# --webpack: this repo's Turbopack dev server (Next's default) hits a
# module-resolution bug against packages/config's .js/.ts extension
# aliasing (see next.config.ts's webpack block) -- webpack mode resolves
# it correctly. db:generate runs first since the Prisma client generated
# on the host isn't visible in this container's own node_modules volume
# (see the node_modules-volume note in docker-compose.yml).
CMD ["sh", "-c", "pnpm db:generate && pnpm --filter web exec next dev --webpack"]
