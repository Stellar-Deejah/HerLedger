#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Starting HerLedger development environment…"

# Ensure .env.local exists for the web app
if [ ! -f "$ROOT/apps/web/.env.local" ]; then
  echo "WARNING: apps/web/.env.local not found. Copy .env.example and fill in values."
fi

# Load the workspace-root .env.local (same file prisma.config.ts and
# `pnpm env:validate` read from) so DATABASE_URL is visible to this check,
# without requiring the developer to have exported it manually.
if [ -f "$ROOT/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Copy .env.example to .env.local at the repo root and fill in DATABASE_URL, then re-run this script." >&2
  exit 1
fi

# Generate the Prisma client before starting either service -- without
# this, the indexer crashes on startup (its first query throws because
# @prisma/client has no generated output yet), and the failure is easy to
# miss since it happens in a backgrounded process.
echo "Generating Prisma client…"
pnpm db:generate

# Start the indexer in the background
echo "Starting indexer…"
pnpm --filter indexer dev &
INDEXER_PID=$!

# Start the web app
# --webpack: this repo's Turbopack dev server (Next's default) hits a
# module-resolution bug against packages/config's .js/.ts extension
# aliasing (see apps/web/next.config.ts's webpack block) -- webpack mode
# resolves it correctly.
echo "Starting web app…"
pnpm --filter web exec next dev --webpack &
WEB_PID=$!

cleanup() {
  echo "Shutting down…"
  kill "$INDEXER_PID" "$WEB_PID" 2>/dev/null || true
}

trap cleanup EXIT

wait
