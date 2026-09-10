#!/usr/bin/env bash
# Build all HerLedger Soroban contracts for wasm32v1-none.
# Requires: Stellar CLI 26.1.0, Rust >= 1.84, wasm32v1-none target installed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$WORKSPACE_DIR"

echo "==> Building HerLedger contracts..."
stellar contract build

echo ""
echo "==> Build complete. WASM artifacts:"
find target/wasm32v1-none/release -maxdepth 1 -name "*.wasm" | sort
