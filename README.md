# HerLedger

HerLedger is a financial-history platform for women-owned businesses built on
the Stellar blockchain. It gives a business a verifiable, portable record of its
financial activity — drawn from real Stellar transactions and selected
third-party attestations — without requiring a bank relationship or a credit
bureau.

---

## The Problem

Women-owned businesses are frequently excluded from formal financing because
they lack documented financial history that lenders trust. Traditional financial
records are siloed, easily altered, and controlled by intermediaries. A business
that has been operating, transacting, and fulfilling commitments for years may
still have nothing portable to show for it.

HerLedger addresses this by anchoring a business's financial history to the
Stellar blockchain — creating a record that is verifiable, tamper-resistant, and
owned by the business rather than an institution.

HerLedger does **not** issue loans, calculate credit scores, make lending
decisions, or guarantee financing. It builds the historical record. What a
business does with that record is up to them.

---

## How Stellar and Soroban Are Used

HerLedger uses the [Stellar](https://stellar.org) network in two ways:

**Transactions as evidence.** Stellar payment transactions are public and
final. When a registered business wallet receives or sends a supported asset,
the HerLedger indexer detects the transaction and records it as a financial
event. Stellar is the source of truth — HerLedger adds application-level
meaning.

**Soroban contracts as registry and state.** Three smart contracts deployed on
Stellar manage the protocol state:

- Business registration and ownership
- Financial event recording, verification, and dispute lifecycle
- Attestation issuance and revocation

All contract writes require the business owner's Stellar wallet signature via
[Freighter](https://freighter.app). HerLedger never holds or uses private keys.

> Stellar transactions are publicly visible on the blockchain. HerLedger does
> not claim otherwise. Private metadata (business name, dispute reasons,
> attestation claims) is stored off-chain; only cryptographic hashes are
> committed on-chain.

---

## How Financial Activity Is Recognised

The HerLedger indexer monitors registered business wallets on Stellar. A
transaction is classified as a HerLedger financial event when **all** of the
following are true:

1. The transaction **succeeded** on Stellar.
2. The asset transferred is on the **supported asset list** managed by the
   FinancialLedger contract.
3. The sending or receiving address is a **registered HerLedger business wallet**.

If any condition is false, the transaction is not classified. Failed
transactions, unsupported tokens, and wallets not registered with HerLedger are
all excluded.

Automatically recognised events from Stellar payments:

| Type | Description |
|------|-------------|
| `PaymentReceived` | Business wallet received a supported asset |
| `PaymentSent` | Business wallet sent a supported asset |

`InvoiceSettled` and `CommitmentFulfilled` are separate event types in the
FinancialLedger contract. They are not automatically detected from Stellar
payment operations — they are recorded through a deliberate protocol action
with supporting attestation.

Every event carries a lifecycle status: **Pending → Verified → Disputed →
Revoked**. Revoked and disputed events remain visible — they are never deleted.

---

## The Three Contracts

### BusinessRegistry

Manages business identity on-chain.

- Registers a business with a unique ID, owner address, wallet address, and
  metadata hash.
- Enforces one active business per owner and one active business per wallet.
- Supports metadata updates and deactivation.
- Inactive businesses remain stored for historical reference.

### FinancialLedger

Manages the financial event lifecycle.

- Maintains the supported asset list.
- Records financial events referencing a Stellar transaction hash.
- Tracks event status (Pending, Verified, Disputed, Revoked).
- Allows the business owner to dispute an incorrect record on-chain.
- Protocol administrators can verify, resolve disputes, and revoke events.
- No event is deleted — full history is preserved.

### AttestationRegistry

Manages third-party claims on financial events.

- Registers and deactivates authorised attesters.
- Allows attesters to issue claims linked to a specific financial event.
- Supports revocation; revoked attestations remain in history.
- The claim content is private; only the hash is stored on-chain.

---

## How the Contract and Application Layers Work Together

```
herledger-contract/          herledger-app/
─────────────────            ──────────────────────────────────────
Soroban contracts   ◄──────  SDK (packages/sdk) — reads contract state
deployed on                   and builds/submits signed transactions
Stellar network
                    ◄──────  Indexer — observes Stellar activity,
                              classifies payments, syncs to database

                    ◄──────  Web app — business onboarding,
                              dashboard, dispute submission,
                              attestation display
```

The contracts are the authority. The application layer reads from and writes to
the contracts. The PostgreSQL database is a derived index — it caches indexed
history for fast querying but does not override on-chain state.

---

## Repository Structure

```
HerLedger/
├── README.md                   This file
│
├── herledger-contract/         Soroban smart contracts (Rust)
│   ├── contracts/
│   │   ├── business_registry/
│   │   ├── financial_ledger/
│   │   └── attestation_registry/
│   ├── Cargo.toml              Workspace manifest
│   ├── rust-toolchain.toml     Pins stable toolchain + wasm32v1-none
│   └── README.md               Contract build, test, and deploy guide
│
└── herledger-app/              Application layer (TypeScript monorepo)
    ├── apps/web/               Next.js 16 frontend
    ├── packages/config/        Typed environment validation
    ├── packages/sdk/           Stellar/Soroban TypeScript SDK
    ├── indexer/                Transaction indexer + HTTP API
    ├── prisma/                 Database schema and migrations
    └── README.md               App setup, deployment, and API guide
```

For detailed documentation see:
- [`herledger-contract/README.md`](herledger-contract/README.md) — contract build, test, and CLI deployment
- [`herledger-app/README.md`](herledger-app/README.md) — application setup, SDK reference, API reference, deployment

---

## Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Rust | ≥ 1.84.0 | Contract development |
| wasm32v1-none target | — | Contract build (`rustup target add wasm32v1-none`) |
| Stellar CLI | 26.1.0 | Contract deployment (`cargo install --locked stellar-cli@26.1.0`) |
| Node.js | ≥ 20.9.0 | Application layer |
| pnpm | ≥ 9 | Application layer (`npm install -g pnpm`) |
| PostgreSQL | ≥ 16 | Application layer |
| Freighter browser extension | latest | Wallet signing in the web app |

---

## Local Setup

### Contracts

```sh
cd herledger-contract

# Install the wasm target if not already present
rustup target add wasm32v1-none

# Run tests (host target — no WASM needed)
cargo test

# Build WASM artifacts
stellar contract build
# Output: target/wasm32v1-none/release/*.wasm
```

See [`herledger-contract/README.md`](herledger-contract/README.md) for full
build and deployment instructions.

### Application

```sh
cd herledger-app

# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local — see Environment Variables below

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate:dev

# Start all services
bash scripts/dev.sh
# Web: http://localhost:3000
# Indexer API: http://localhost:4000
```

See [`herledger-app/README.md`](herledger-app/README.md) for the full setup guide.

---

## Running Contract Tests

```sh
cd herledger-contract

# Run all contract tests
cargo test

# Run tests per contract
cargo test -p business-registry
cargo test -p financial-ledger
cargo test -p attestation-registry
# Format check
cargo fmt --check

# Lint
cargo clippy -- -D warnings
```

---

## Running the Application

```sh
cd herledger-app

# Development (web + indexer)
bash scripts/dev.sh

# Web app only
pnpm --filter web dev

# Indexer only
pnpm --filter indexer dev

# Production build
pnpm build
```

---

## Environment Variables

The application requires the following variables. A full template is in
[`herledger-app/.env.example`](herledger-app/.env.example).

```env
# Application
NODE_ENV=development
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/herledger_dev

# Authentication (generate: openssl rand -hex 32)
BETTER_AUTH_SECRET=

# Stellar network
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contract IDs — populate after deployment
BUSINESS_REGISTRY_CONTRACT_ID=
FINANCIAL_LEDGER_CONTRACT_ID=
ATTESTATION_REGISTRY_CONTRACT_ID=

# Indexer
INDEXER_API_URL=http://localhost:4000

# Browser-safe (NEXT_PUBLIC_*)
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID=
NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID=
NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID=
```

`DATABASE_URL` and `BETTER_AUTH_SECRET` are server-only — never prefix them
with `NEXT_PUBLIC_`. The application throws a clear error on startup if required
variables are missing.

Contract IDs are only available after actual deployment. Do not invent values.

---

## Testing

### Contracts

```sh
cd herledger-contract
cargo test          # all contracts
cargo test -p business-registry
```

### Application

```sh
cd herledger-app
pnpm test           # all unit/integration tests (Vitest)
pnpm test:e2e       # end-to-end tests (Playwright, requires running app)
pnpm typecheck      # TypeScript strict mode check
pnpm format         # Prettier format check
```

---

## Deployment Overview

### Contracts

Deploy each contract to Stellar Testnet using the Stellar CLI:

```sh
stellar contract deploy \
  --wasm target/wasm32v1-none/release/business_registry.wasm \
  --network testnet \
  --source <deployer-account>
```

Repeat for `financial_ledger` and `attestation_registry`. Record the contract
IDs and set them in the application environment.

Full deployment steps are in [`herledger-contract/README.md`](herledger-contract/README.md).

### Application

| Service | Platform | Root | Build | Start |
|---------|----------|------|-------|-------|
| Web (Next.js) | Vercel | `herledger-app/apps/web` | `pnpm --filter web build` | `pnpm --filter web start` |
| Indexer (Fastify) | Render | `herledger-app/indexer` | `pnpm --filter indexer build` | `pnpm --filter indexer start` |
| Database | PostgreSQL 16 | — | — | `pnpm db:migrate` |

Run `pnpm db:migrate` before starting any deployment. Never run
`migrate:dev` or reset migrations in production.

Full deployment configuration is in [`herledger-app/README.md`](herledger-app/README.md).

---

## Observability & Metrics

The indexer service is instrumented with structured JSON logging (Pino), request tracing correlation IDs, and a Prometheus `/metrics` endpoint.

### Structured Logging (Pino)

All logging in the indexer outputs machine-parseable JSON with standardized fields:
- `level`: Log level (`info`, `warn`, `error`, `debug`).
- `time`: ISO 8601 timestamp (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- `service`: `"indexer"`.
- `environment`: `process.env.NODE_ENV` (`development`, `test`, `production`).
- `correlationId`: Distributed trace ID associated with the request or sync batch.

**Configuration:**
- `LOG_LEVEL`: Controls minimum log severity (`debug`, `info`, `warn`, `error`, default: `info`).

**Example Log Output:**
```json
{
  "level": "info",
  "time": "2026-08-19T00:30:00.123Z",
  "service": "indexer",
  "environment": "production",
  "correlationId": "4f932e6a-1234-4b5c-8901-abcdef123456",
  "job": "sync-ledger",
  "event": "cycle-begin",
  "lastCheckpoint": 124500,
  "latestLedger": 124510,
  "syncLag": 10,
  "msg": "Beginning ledger sync cycle"
}
```

### Request Correlation IDs

Fastify requests are automatically tagged with a correlation ID:
- If the incoming request includes `x-correlation-id` or `x-request-id`, that ID is preserved.
- Otherwise, a UUID v4 correlation ID is automatically generated.
- The ID is set in the `x-correlation-id` response header, attached to child loggers, and propagated across async execution chains using `AsyncLocalStorage`.

### Prometheus Metrics Endpoint (`GET /metrics`)

The indexer exposes Prometheus-compatible metrics on `/metrics`:

| Metric Name | Type | Description | Labels |
|---|---|---|---|
| `events_indexed_total` | Counter | Total financial events successfully indexed | `event_type`, `status` |
| `sync_lag_ledgers` | Gauge | Ledger lag between Stellar network tip and indexer checkpoint | — |
| `rpc_request_duration_seconds` | Histogram | Latency of Stellar Horizon / Soroban RPC calls in seconds | `operation`, `status` |
| `db_query_duration_seconds` | Histogram | Database query execution duration in seconds | `operation` |
| `herledger_indexer_nodejs_*` | Gauge / Counter | Process and Node.js runtime metrics (memory, event loop, GC) | — |

---

## Security and Privacy

- **No private keys are stored.** All transaction signing is performed by the
  user's Freighter wallet. The application never requests or handles Stellar
  secret keys.
- **Stellar transactions are public.** HerLedger does not claim otherwise.
  Transaction data on the Stellar blockchain is visible to anyone.
- **Private metadata stays off-chain.** Business names, dispute reasons, and
  attestation claim contents are not published to the blockchain. Only
  cryptographic hashes are committed on-chain for integrity verification.
- **Blockchain records are immutable.** Once indexed, Stellar-derived fields
  (transaction hash, amount, sender, recipient) cannot be altered through
  application API requests.
- **Application auth is separate from wallet auth.** Signing into HerLedger
  with an email/password session and connecting a Stellar wallet are
  independent steps.

> ⚠️ These smart contracts have **not been audited**. This is an MVP
> implementation. Do not use in production for real financial data without a
> professional security review. See
> [`herledger-app/SECURITY.md`](herledger-app/SECURITY.md) for the full
> security policy.

---

## Current Project Status

| Component | Status |
|-----------|--------|
| BusinessRegistry contract | Implemented — 16 tests passing, WASM built |
| FinancialLedger contract | Implemented — tests written, WASM not yet built |
| AttestationRegistry contract | Implemented — 18 tests written, WASM not yet built |
| TypeScript SDK (reads + writes) | Scaffolded — written but not tested against deployed contracts |
| Freighter wallet integration | Scaffolded — written but not integration-tested |
| Better Auth (application auth) | Scaffolded — written but not integration-tested |
| Next.js web app (frontend) | Scaffolded — written but not integration-tested |
| Indexer (transaction sync) | Scaffolded — written but not integration-tested |
| Indexer HTTP API | Scaffolded — written but not integration-tested |
| PostgreSQL schema | Defined — migrations not yet applied to any environment |
| CI | Scaffolded — not yet validated end-to-end |
| Contracts deployed to Testnet | **Not deployed** |
| Application deployed | **Not deployed** |

The application is not considered functional until all three contracts are
deployed, real contract IDs are configured, the indexer has processed at least
one real transaction, and end-to-end transaction flow has been validated on
Testnet.
