# HerLedger — Application Layer

HerLedger is a financial-history platform for women-owned businesses built on
the Stellar blockchain. It records recognized Stellar transactions and verified
attestations so a business can build a portable, auditable financial history —
without storing unnecessary private information on-chain.

> **HerLedger does not** issue loans, calculate credit scores, make lending
> decisions, or claim that Stellar transactions are private.

---

## Table of Contents

1. [What HerLedger Does](#what-herledger-does)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Tech Stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Local Setup](#local-setup)
7. [Environment Variables](#environment-variables)
8. [Database](#database)
9. [Running Locally](#running-locally)
10. [Building](#building)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Contract Integration](#contract-integration)
14. [SDK Reference](#sdk-reference)
15. [Indexer Reference](#indexer-reference)
16. [API Reference](#api-reference)
17. [Onboarding Flow](#onboarding-flow)
18. [Financial Event Classification](#financial-event-classification)
19. [Dispute Flow](#dispute-flow)
20. [Privacy Model](#privacy-model)
21. [Security](#security)
22. [Contributing](#contributing)

---

## What HerLedger Does

| Feature               | Description                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| Business registration | Register a woman-owned business on-chain via the BusinessRegistry Soroban contract |
| Wallet association    | Link a Stellar wallet address to a business identity                               |
| Financial activity    | Detect and index supported Stellar payment transactions                            |
| Event verification    | Track Pending → Verified → Disputed → Revoked lifecycle                            |
| Attestations          | Display third-party claims linked to financial events                              |
| Dispute flow          | Allow a business owner to challenge an incorrect record on-chain                   |
| Privacy               | Keep private metadata off-chain; commit only cryptographic hashes                  |

**Not supported:** loans, credit scores, lending decisions, unsupported asset classification, private Stellar transactions.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        User                              │
└──────────┬──────────────────────────┬────────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐       ┌──────────────────────┐
│  Next.js 16 Web  │       │   Freighter Wallet   │
│  (App Router)    │       │   (browser ext.)     │
│                  │       └──────────┬───────────┘
│  Better Auth     │                  │ signs txns
│  (app sessions)  │                  ▼
│                  │       ┌──────────────────────┐
│  Server Actions  │       │  Stellar Network     │
│  API Routes      │       │  Soroban Contracts   │
└──────┬───────────┘       └──────────────────────┘
       │ reads                        ▲
       ▼                              │ observes
┌──────────────────┐       ┌──────────────────────┐
│  Indexer API     │◄──────│  Indexer Process     │
│  (Fastify)       │       │  (ledger sync job)   │
└──────┬───────────┘       └──────────────────────┘
       │
       ▼
┌──────────────────┐
│   PostgreSQL     │
│   (derived       │
│    index only)   │
└──────────────────┘
```

### Key principles

- **User wallets sign everything.** The app never holds or uses private keys.
- **The indexer observes.** It does not initiate contract writes.
- **The database is an index.** Stellar is the source of truth.
- **Blockchain-derived records are immutable** after indexing (no silent rewrites).
- **Application auth is separate from wallet auth.** Signing in ≠ wallet connected.

---

## Repository Structure

```
HerLedger/
├── herledger-contract/          Soroban smart contracts (Rust)
│   ├── contracts/
│   │   ├── business_registry/
│   │   ├── financial_ledger/
│   │   └── attestation_registry/
│   └── target/wasm32v1-none/release/   Built WASM artifacts
│
└── herledger-app/               Application layer (this directory)
    ├── apps/
    │   └── web/                 Next.js 16 frontend
    │       ├── app/
    │       │   ├── (marketing)/ Public landing page
    │       │   ├── dashboard/   Authenticated dashboard
    │       │   ├── auth/        Sign in / sign up
    │       │   └── api/         API route handlers
    │       ├── components/      React components
    │       │   ├── ui/          Design system primitives
    │       │   ├── wallet/      Freighter integration
    │       │   ├── business/    Business profile & registration
    │       │   ├── activity/    Financial activity display
    │       │   ├── attestations/Attestation display
    │       │   ├── disputes/    Dispute submission
    │       │   ├── navigation/  App shell navigation
    │       │   └── settings/    Account & privacy settings
    │       ├── lib/
    │       │   ├── auth/        Better Auth client & server
    │       │   ├── stellar/     Network configuration helpers
    │       │   └── utils/       Formatting utilities
    │       ├── middleware.ts     Route protection
    │       └── next.config.ts
    │
    ├── packages/
    │   ├── config/              Typed environment validation (Zod)
    │   └── sdk/                 Stellar/Soroban TypeScript SDK
    │       └── src/
    │           ├── contracts/   Contract clients + XDR encoding
    │           ├── rpc/         Soroban RPC client factory
    │           ├── wallet/      Freighter adapter
    │           ├── types/       Shared TypeScript types
    │           └── errors/      Typed error classes
    │
    ├── indexer/                 Transaction indexer + HTTP API
    │   └── src/
    │       ├── api/             Fastify routes
    │       ├── config/          Env config
    │       ├── db/              Prisma client + repositories
    │       ├── index/           Indexing business logic
    │       ├── jobs/            Sync job (ledger polling)
    │       ├── stellar/         Horizon + RPC helpers
    │       └── types/           Indexer-specific types
    │
    ├── prisma/
    │   ├── schema.prisma        Database schema
    │   └── migrations/          Applied migrations
    │
    ├── scripts/
    │   ├── dev.sh               Start all services
    │   ├── test.sh              Run test suite
    │   └── generate-client.sh   Regenerate Prisma client
    │
    ├── .env.example             Required environment variables
    ├── pnpm-workspace.yaml      Monorepo workspace config
    └── README.md                This file
```

---

## Tech Stack

| Layer              | Technology             | Version |
| ------------------ | ---------------------- | ------- |
| Runtime            | Node.js                | ≥20.9.0 |
| Package manager    | pnpm                   | 9+      |
| Frontend framework | Next.js                | 16.3.1  |
| UI library         | React                  | 19.2.8  |
| Language           | TypeScript             | 7.0.2   |
| Stellar SDK        | @stellar/stellar-sdk   | 16.2.0  |
| Wallet             | @stellar/freighter-api | 6.0.1   |
| Validation         | Zod                    | 4.4.3   |
| Authentication     | Better Auth            | 1.6.28  |
| Database           | PostgreSQL             | 16+     |
| ORM                | Prisma                 | 7.9.1   |
| API server         | Fastify                | 5.12.0  |
| Testing            | Vitest                 | 4.1.10  |
| E2E testing        | Playwright             | 1.51.1  |

---

## Prerequisites

### Node.js

```sh
# Check version
node --version   # requires >=20.9.0
```

Install via [nvm](https://github.com/nvm-sh/nvm) or the [official installer](https://nodejs.org).

### pnpm

```sh
npm install -g pnpm@9
```

### PostgreSQL 16+

```sh
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16
```

### Stellar CLI (for contract deployment only)

```sh
cargo install --locked stellar-cli@26.1.0
```

> The Stellar CLI is only needed when deploying contracts. It is **not** required for running the application layer.

### Rust + wasm32v1-none (for contract development only)

```sh
rustup target add wasm32v1-none
```

---

## Local Setup

### 1. Clone and enter the repo

```sh
git clone https://github.com/Stellar-Deejah/HerLedger.git
cd HerLedger/herledger-app
```

### 2. Install dependencies

```sh
pnpm install
```

### 3. Configure environment

```sh
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in all values. See [Environment Variables](#environment-variables) for details.

### 4. Create the database

```sh
createdb herledger_dev
```

### 5. Generate Prisma client and run migrations

```sh
pnpm db:generate
pnpm db:migrate:dev
```

### 6. Start development

```sh
bash scripts/dev.sh
```

Or run each service separately:

```sh
# Terminal 1 — web app
pnpm --filter web dev

# Terminal 2 — indexer
pnpm --filter indexer dev
```

- Web: http://localhost:3000
- Indexer API: http://localhost:4000

---

## Environment Variables

All required variables are documented in `.env.example`.

```env
# ── Application ────────────────────────────────────────────
NODE_ENV=development
APP_URL=http://localhost:3000

# ── Database ───────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/herledger_dev

# ── Authentication ─────────────────────────────────────────
# Generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=

# ── Stellar (server-side) ──────────────────────────────────
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# ── Contract IDs (populate after deployment) ───────────────
BUSINESS_REGISTRY_CONTRACT_ID=
FINANCIAL_LEDGER_CONTRACT_ID=
ATTESTATION_REGISTRY_CONTRACT_ID=

# ── Indexer ────────────────────────────────────────────────
INDEXER_API_URL=http://localhost:4000

# ── Browser-safe (NEXT_PUBLIC_*) ───────────────────────────
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID=
NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID=
NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID=
```

### Variable rules

- `DATABASE_URL` and `BETTER_AUTH_SECRET` are **server-only**. Never prefix them with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_*` variables are safe for browser exposure.
- The application fails at startup with a descriptive error if required variables are missing.
- Contract IDs are populated after deploying `herledger-contract`. **Never invent values.**

---

## Database

### Schema overview

| Model                | Purpose                                 |
| -------------------- | --------------------------------------- |
| `User`               | Application user account (Better Auth)  |
| `Session`            | Auth session (Better Auth)              |
| `Account`            | OAuth/password account (Better Auth)    |
| `Verification`       | Email verification tokens (Better Auth) |
| `BusinessProfile`    | Registered business linked to a user    |
| `FinancialEvent`     | Indexed on-chain financial events       |
| `Attestation`        | Third-party attestations on events      |
| `StellarTransaction` | Raw Stellar transaction records         |
| `IndexerCheckpoint`  | Ledger sync progress per stream         |

### Key database rules

- `amount` is stored as `String` — never cast to `Number`.
- Blockchain-derived fields (`stellarReference`, `amount`, `assetAddress`) are **immutable** after first insert.
- Only `status` is updated by the indexer after initial indexing.
- UUIDs / cuid for application IDs; hex strings for on-chain IDs.

### Commands

```sh
# Generate Prisma client after schema changes
pnpm db:generate

# Create a new migration (dev only)
pnpm db:migrate:dev

# Apply migrations (production / CI)
pnpm db:migrate
```

---

## Running Locally

```sh
# All services
bash scripts/dev.sh

# Web only
pnpm --filter web dev

# Indexer only
pnpm --filter indexer dev

# Type check everything
pnpm typecheck

# Format check
pnpm format

# Format write
pnpm format:write
```

---

## Building

```sh
# Full monorepo build (packages first, then web)
pnpm build

# Web app only
pnpm --filter web build

# Indexer only
pnpm --filter indexer build
```

---

## Testing

```sh
# All unit/integration tests
pnpm test

# SDK tests only
pnpm --filter @herledger/sdk test

# Indexer tests only
pnpm --filter indexer test

# Web tests only
pnpm --filter web test

# E2E tests (requires running app)
pnpm test:e2e
```

Tests use **Vitest** for unit/integration and **Playwright** for E2E.
E2E tests must not depend on Mainnet — use Testnet or mocks.

---

## Deployment

### Frontend — Vercel (or equivalent)

| Setting        | Value                     |
| -------------- | ------------------------- |
| Root directory | `herledger-app/apps/web`  |
| Build command  | `pnpm --filter web build` |
| Start command  | `pnpm --filter web start` |
| Node version   | 20.x or 22.x              |

Set all environment variables in the Vercel dashboard.

- Never expose `DATABASE_URL` or `BETTER_AUTH_SECRET` as `NEXT_PUBLIC_*`.
- All `NEXT_PUBLIC_*` variables must also be set.

Run Prisma migrations before deploying:

```sh
pnpm db:migrate
```

### Indexer — Render (or equivalent long-running service)

| Setting        | Value                         |
| -------------- | ----------------------------- |
| Root directory | `herledger-app/indexer`       |
| Build command  | `pnpm --filter indexer build` |
| Start command  | `pnpm --filter indexer start` |

The indexer requires access to `DATABASE_URL` and all Stellar environment variables.
It does **not** need `BETTER_AUTH_SECRET` or any `NEXT_PUBLIC_*` variables.

### Database — PostgreSQL

- Provision PostgreSQL 16 in the same region as the indexer.
- Use an internal/private connection string between indexer and database.
- Do not expose PostgreSQL directly to the public internet.
- Always run `pnpm db:migrate` before starting a new deployment.

---

## Contract Integration

The application layer communicates with three Soroban contracts deployed on Stellar:

| Contract              | Responsibility                                                |
| --------------------- | ------------------------------------------------------------- |
| `BusinessRegistry`    | Business registration, ownership, wallet association          |
| `FinancialLedger`     | Financial event recording, verification, disputes, revocation |
| `AttestationRegistry` | Attester management and attestation lifecycle                 |

### After deploying contracts

1. Copy the deployed contract IDs from the Stellar CLI output.
2. Set in `apps/web/.env.local` (and production environment):
   ```
   BUSINESS_REGISTRY_CONTRACT_ID=C...
   FINANCIAL_LEDGER_CONTRACT_ID=C...
   ATTESTATION_REGISTRY_CONTRACT_ID=C...
   NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID=C...
   NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID=C...
   NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID=C...
   ```
3. Restart the indexer and web app.

The application will throw a descriptive startup error if contract IDs are missing.

> **Do not invent contract IDs.** The application cannot be considered fully
> integrated until all three contracts are deployed and real IDs are configured.

---

## SDK Reference

`packages/sdk` is the single source of truth for all Stellar/Soroban client interactions.
React components must not construct contract calls directly.

### BusinessRegistry

```typescript
import {
  getBusiness,
  getBusinessByWallet,
  registerBusiness,
  updateBusinessMetadata,
  deactivateBusiness,
} from "@herledger/sdk";

// Read a business by on-chain ID (hex)
const business = await getBusiness(businessId, stellarConfig, contractConfig);
// Returns: Business | null

// Read by wallet address
const business = await getBusinessByWallet(walletAddress, stellarConfig, contractConfig);

// Register — requires Freighter to be connected, returns tx hash
const result = await registerBusiness(
  { businessId, owner, wallet, metadataHash, sourceAccount },
  stellarConfig,
  contractConfig
);
// Returns: { hash: string, success: boolean, ledger?: number }
```

### FinancialLedger

```typescript
import {
  getFinancialEvent,
  getBusinessEvents,
  isSupportedAsset,
  recordFinancialEvent,
  disputeFinancialEvent,
  verifyFinancialEvent,
  resolveFinancialEvent,
  revokeFinancialEvent,
} from "@herledger/sdk";
```

### AttestationRegistry

```typescript
import {
  getAttestation,
  isValidAttestation,
  registerAttester,
  deactivateAttester,
  createAttestation,
  revokeAttestation,
} from "@herledger/sdk";
```

### Amount handling

```typescript
// Amounts are always bigint — never Number
const event: FinancialEvent = await getFinancialEvent(eventId, config, contracts);
console.log(event.amount); // bigint, e.g. 100_000_000n (= 10 XLM in stroops)

// Format at the display boundary only
import { formatAmount } from "@/lib/utils/format";
const display = formatAmount(event.amount); // "10.0000000"
```

### Error types

```typescript
import { WalletError, RpcError, ContractError, ValidationError } from "@herledger/sdk";

try {
  await registerBusiness(params, config, contracts);
} catch (err) {
  if (err instanceof WalletError) {
    // User rejected, extension unavailable, etc.
  } else if (err instanceof ContractError) {
    // Contract returned an error code
  } else if (err instanceof RpcError) {
    // Network/RPC issue
  }
}
```

---

## Indexer Reference

The indexer is a long-running Node.js process that:

1. Reads all registered HerLedger business wallets from the database.
2. Polls Horizon for new transactions on those wallets.
3. Classifies supported asset transfers as `PaymentReceived` or `PaymentSent`.
4. Inserts records idempotently (same transaction processed twice = no duplicate).
5. Persists a ledger checkpoint after each successful sync cycle.
6. Recovers from interruption by reading the checkpoint on restart.

### Ledger checkpoint

The indexer stores a `IndexerCheckpoint` record per stream (e.g. `"main"`).
On restart it resumes from `lastLedger`. On first run it starts from ledger 0
(fetching all available history for registered wallets).

### Idempotency

All database writes use `upsert` with the on-chain event ID as the unique key.
Processing the same transaction twice is safe — the second pass is a no-op for
blockchain-derived fields, and only updates mutable status fields.

### Payment classification rules

| Rule                         | PaymentReceived | PaymentSent |
| ---------------------------- | --------------- | ----------- |
| Transaction succeeded        | ✓ required      | ✓ required  |
| Business wallet is recipient | ✓               | —           |
| Business wallet is sender    | —               | ✓           |
| Asset is supported           | ✓ required      | ✓ required  |

Failed transactions are **never** classified.
Unsupported assets are **never** classified.

---

## API Reference

The indexer exposes a read-only HTTP API on port 4000.

All responses follow:

```json
{ "data": { ... }, "error": null }
// or on failure:
{ "data": null, "error": { "code": "ERROR_CODE", "message": "Human message" } }
```

### Endpoints

| Method | Path                                   | Description                          |
| ------ | -------------------------------------- | ------------------------------------ |
| `GET`  | `/health`                              | Health check with DB connectivity    |
| `GET`  | `/businesses/:businessId`              | Get indexed business by on-chain ID  |
| `GET`  | `/businesses/:businessId/events`       | Paginated financial events (max 100) |
| `GET`  | `/businesses/:businessId/attestations` | All attestations for a business      |
| `GET`  | `/transactions/:hash`                  | Get a Stellar transaction by hash    |
| `GET`  | `/supported-assets`                    | Supported asset info                 |
| `GET`  | `/indexer/status`                      | Current sync checkpoint              |

### Pagination

```
GET /businesses/:id/events?offset=0&limit=20
```

- `offset`: integer ≥ 0, default 0
- `limit`: integer 1–100, default 20
- Response includes `pagination.count` for next-page detection

---

## Onboarding Flow

```
1. Sign up / sign in (Better Auth — email + password)
        ↓
2. Connect Stellar wallet (Freighter browser extension)
        ↓
3. Freighter confirms wallet ownership (no secret key transmitted)
        ↓
4. Enter business name
        ↓
5. App derives deterministic business ID from wallet + name + timestamp
        ↓
6. App hashes private metadata (name committed as hash only)
        ↓
7. App builds BusinessRegistry.register_business() transaction
        ↓
8. Freighter prompts user to sign
        ↓
9. App submits signed transaction to Stellar
        ↓
10. App polls for confirmation (up to 60 seconds)
        ↓
11. On-chain success → app saves BusinessProfile to database
        ↓
12. Redirect to dashboard
        ↓
13. Indexer begins detecting activity for the registered wallet
```

The business is **not** marked registered in the database until the on-chain
transaction is confirmed. If the transaction fails, the flow returns to step 7.

---

## Financial Event Classification

HerLedger only classifies events from **supported assets** in **successful transactions**.

### PaymentReceived

A Stellar payment operation where:

- the transaction succeeded
- the destination address matches a registered HerLedger business wallet
- the asset is in the supported asset list

### PaymentSent

A Stellar payment operation where:

- the transaction succeeded
- the source address matches a registered HerLedger business wallet
- the asset is in the supported asset list

### What is NOT classified

- Failed transactions (regardless of amount)
- Unsupported tokens
- Non-payment operations
- Transactions where neither sender nor recipient is a registered business

HerLedger does **not** claim that every incoming payment is revenue.

---

## Dispute Flow

A business owner can challenge an incorrect HerLedger record:

```
Dashboard → Activity → Select event → Challenge record
        ↓
Enter reason for dispute (kept off-chain; only hash committed)
        ↓
App hashes the reason text
        ↓
App builds FinancialLedger.dispute_event() transaction
        ↓
Freighter prompts owner to sign
        ↓
Transaction submitted and confirmed
        ↓
Event status changes to Disputed on-chain and in the index
```

**The owner cannot:**

- Delete the financial event
- Edit the Stellar transaction reference
- Change the amount, sender, or recipient
- Directly mark the event Verified or Revoked

Dispute changes HerLedger application state, **not** Stellar history.
Revoked and disputed events remain visible in the UI — they are never hidden.

---

## Privacy Model

| Data                      | Storage                   | Visibility                   |
| ------------------------- | ------------------------- | ---------------------------- |
| Stellar transactions      | Stellar blockchain        | Public — anyone can query    |
| Business ID               | On-chain (hash)           | Public                       |
| Metadata hash             | On-chain (hash only)      | Public hash, private content |
| Business name             | Off-chain database        | Private to the application   |
| Dispute reason            | Off-chain; hash on-chain  | Reason text is private       |
| Claim/attestation content | Off-chain; hash on-chain  | Content is private           |
| Auth session              | Server-side secure cookie | Private                      |
| Stellar private key       | **Never stored anywhere** | N/A                          |

The application does not claim Stellar wallet balances or transactions are private.
Blockchain data is public. HerLedger minimizes additional personal information
stored on-chain by committing only cryptographic hashes.

---

## Security

See [SECURITY.md](SECURITY.md) for the full security policy.

Key properties:

- **No private key storage.** The app never requests, stores, or logs Stellar private keys.
- **Freighter signs everything.** All contract writes are user-authorized via Freighter.
- **Server secrets never reach the browser.** `DATABASE_URL` and `BETTER_AUTH_SECRET` are never in `NEXT_PUBLIC_*`.
- **Input validation.** All API inputs validated with Zod. No `as any` bypasses.
- **Immutable blockchain records.** Stellar-derived fields cannot be changed by API requests.
- **Auth ≠ wallet.** Signing into HerLedger and connecting a Stellar wallet are independent steps.

> ⚠️ **These contracts have not been audited.** Do not deploy with real financial data without a professional security review.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

```sh
# Before committing
pnpm typecheck
pnpm format
pnpm test

# Commit format (Conventional Commits)
feat(sdk): add business registry reads
fix(web): correct wallet disconnect state
chore(repo): update dependencies
test(indexer): cover payment classification
```

---

## License

See [LICENSE](../herledger-contract/LICENSE).
