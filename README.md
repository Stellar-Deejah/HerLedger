# HerLedger

[![CI](https://github.com/Stellar-Deejah/HerLedger/actions/workflows/ci.yml/badge.svg)](https://github.com/Stellar-Deejah/HerLedger/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Network: Stellar Testnet](https://img.shields.io/badge/Network-Stellar_Testnet-08B5E5.svg)](https://stellar.org)
[![Contracts: Soroban](https://img.shields.io/badge/Soroban-v22-black.svg)](herledger-contract)
[![E2E: Playwright (32/32 Passed)](https://img.shields.io/badge/Playwright-32%2F32%20Passed-brightgreen.svg)](herledger-app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org)

> **Non-custodial, verifiable financial history and reputation for women-owned businesses, powered by the Stellar blockchain and Soroban smart contracts.**

HerLedger gives women entrepreneurs a tamper-resistant, portable record of their commercial activity anchored to real Stellar transactions and accredited third-party attestations without requiring a legacy banking relationship or credit bureau intermediary.

---

## Table of Contents

1. [ Executive Summary](#executive-summary)
   - [The Global Credit Gap ($1.7 Trillion)](#the-global-credit-gap-17-trillion)
   - [The HerLedger Solution](#the-herledger-solution)
   - [Why Stellar & Soroban?](#why-stellar--soroban)
2. [How the Protocol Works](#how-the-protocol-works)
   - [Transactions as Evidence](#transactions-as-evidence)
   - [Financial Event Classification](#financial-event-classification)
   - [The Three Soroban Contracts](#the-three-soroban-contracts)
   - [Hybrid Privacy Architecture](#hybrid-privacy-architecture)
3. [System Architecture](#system-architecture)
4. [Current Project Status & CI Verification](#current-project-status--ci-verification)
5. [ Roadmap & Milestones](#grant-roadmap--milestones)
6. [Evaluator Quickstart (Run & Verify in 5 Mins)](#evaluator-quickstart-run--verify-in-5-mins)
7. [Repository Structure](#repository-structure)
8. [Local Development Setup](#local-development-setup)
9. [Observability & Telemetry](#observability--telemetry)
10. [Security, Governance & License](#security-governance--license)

---

##  Executive Summary

### The Global Credit Gap ($1.7 Trillion)

Women entrepreneurs own over 33% of formal businesses and more than 50% of micro-enterprises in emerging markets. Yet according to the **International Finance Corporation (IFC)** and the **World Bank**, women-owned businesses face a staggering **$1.7 trillion unmet financing gap**.

The bottleneck is rarely commercial viability ; it is **verifiability**:
- **No Credit Bureau Footprint**: Emerging market entrepreneurs frequently operate in cash, mobile money, or localized digital accounts that never report to formal credit rating agencies.
- **Collateral Bias**: Traditional banking systems demand physical real estate or asset pledges that female founders disproportionately lack due to customary property laws.
- **Siloed & Alterable Records**: Paper invoices, informal ledgers, and proprietary transaction receipts are easily forged, lost, or dismissed as unverifiable by institutional microfinance lenders.

### The HerLedger Solution

HerLedger bridges this gap by creating **self-sovereign financial reputation**:
1. **On-Chain Evidence**: Every time a registered woman-owned business transacts on Stellar in supported assets (e.g. USDC, local stablecoins, XLM), the transaction is cryptographically indexed and linked to her on-chain business profile.
2. **Third-Party Attestations**: Accredited cooperatives, suppliers, and microfinance organizations can issue cryptographic claims confirming invoice settlement and trade commitment fulfillment.
3. **Dispute Resolution & Event Lifecycle**: Business owners can flag or dispute incorrect entries directly on-chain, preserving an unalterable, transparent history (**Pending → Verified → Disputed → Revoked**).
4. **Sovereign Portability**: The business owns its verifiable track record. HerLedger **does not** issue loans, calculate credit scores, or make lending decisions. What the business does with its provable history is entirely under its own control.

### Why Stellar & Soroban?

- **Sub-Cent Fees & Finality**: Businesses transacting small-ticket commerce cannot afford $5–$20 gas fees. Stellar provides 3-to-5 second deterministic finality with fractions of a cent in transaction fees.
- **Native Multi-Asset Architecture**: Direct support for real-world fiat stablecoins (USDC, EURC, and regional on/off-ramp anchors) already thriving on the Stellar network.
- **Soroban WebAssembly Smart Contracts**: Safe, formally verifiable Rust contracts enforcing business registration rules, multi-sig attestation authorities, and tamper-proof event status lifecycles.

---

## How the Protocol Works

### Transactions as Evidence

Stellar payment transactions are public, immutable, and final. When a registered business wallet receives or sends a supported asset, the HerLedger indexer captures the transaction and anchors it as a financial event on Soroban. Stellar serves as the underlying source of truth, and HerLedger contextualizes it into auditable financial history.

### Financial Event Classification

A transaction is recognized and classified as a HerLedger financial event when **all** of the following criteria are met:

1. The transaction **succeeded** on the Stellar network.
2. The asset transferred is included on the **supported asset list** managed by the `FinancialLedger` contract.
3. The sending or receiving address belongs to a **registered HerLedger business wallet**.

| Event Type | Source | Description |
|---|---|---|
| `PaymentReceived` | Stellar Payment Operation | Business wallet received a supported asset |
| `PaymentSent` | Stellar Payment Operation | Business wallet sent a supported asset |
| `InvoiceSettled` | Protocol Action + Attestation | A trade invoice was fulfilled with counterparty proof |
| `CommitmentFulfilled` | Protocol Action + Attestation | A commercial delivery or credit obligation was satisfied |

Every event maintains an immutable lifecycle: **Pending → Verified → Disputed → Revoked**. Revoked and disputed events are **never deleted**, ensuring a complete, audit-grade historical trail.

### The Three Soroban Contracts

```
herledger-contract/
├── business_registry     Identity, ownership, metadata hashes, 1-to-1 wallet mapping
├── financial_ledger      Asset whitelisting, event registration, dispute management
└── attestation_registry  Authorized attester issuance, revocation, and proof verification
```

1. **`BusinessRegistry`**:
   - Registers a business with a unique ID, owner principal, wallet address, and SHA-256 metadata hash.
   - Enforces invariant constraints: strictly one active business per owner and one active business per wallet.
   - Supports metadata updates and deactivation while preserving past records.

2. **`FinancialLedger`**:
   - Manages whitelisted commercial assets (e.g. USDC, XLM).
   - Records financial events bound to specific Stellar transaction hashes.
   - Manages the verification lifecycle and enables business owners to raise on-chain disputes.
   - Immutable audit trail: events can be revoked by protocol administrators, but are never deleted from contract storage.

3. **`AttestationRegistry`**:
   - Manages authorized attesters (cooperatives, audit firms, trade associations).
   - Allows accredited attesters to issue cryptographically signed claims bound to financial events.
   - Supports transparent revocation while maintaining claim history.

### Hybrid Privacy Architecture

Commercial privacy is essential for business safety:
- **On-Chain**: Transaction hashes, event lifecycle states, and SHA-256 integrity commitments are stored on Soroban.
- **Off-Chain**: Business names, dispute rationales, customer invoices, and personal identifiable information (PII) are stored off-chain in encrypted storage or local databases.
- **Zero Key Custody**: All transactions are signed by the business owner's [Freighter](https://freighter.app) wallet. HerLedger never stores, handles, or transmits private keys.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Business Owner / Attester                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ Signs with Freighter
                                    ▼
┌───────────────────────┐       ┌────────────────────────────────────────┐
│     Next.js 16 Web    │       │            Stellar Network             │
│      (App Router)     │       │           Soroban Contracts            │
│                       │       │                                        │
│  - Better Auth        │       │  - BusinessRegistry.wasm               │
│  - Dashboard & Profile│──────▶│  - FinancialLedger.wasm                │
│  - Dispute Submission │       │  - AttestationRegistry.wasm            │
│  - Attestation Viewer │       │                                        │
└───────────┬───────────┘       └───────────────────┬────────────────────┘
            │                                       │
            │ Reads                                 │ Observes Ledgers
            ▼                                       ▼
┌───────────────────────┐       ┌────────────────────────────────────────┐
│      Indexer API      │◀──────│            Indexer Process             │
│       (Fastify)       │       │                                        │
│                       │       │  - Real-time Soroban RPC polling       │
│  - REST Endpoints     │       │  - Event classification engine         │
│  - Prometheus /metrics│       │  - Checkpointing & auto-healing        │
│  - Pino JSON Logging  │       │  - Prometheus latency/lag metrics      │
└───────────┬───────────┘       └───────────────────┬────────────────────┘
            │                                       │
            └───────────────────┬───────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │       PostgreSQL       │
                    │  (Derived Cache Index) │
                    └────────────────────────┘
```

---

## Current Project Status & CI Verification

The HerLedger codebase is **fully implemented, tested, and passing continuous integration (CI) with 100% green builds on `main` and `dev`**.

| Component | Architecture | Status | Test Coverage |
|---|---|---|---|
| **BusinessRegistry Contract** | Soroban (Rust) | ✅ Complete & Verified | 16 unit tests passing, WASM artifact compiled |
| **FinancialLedger Contract** | Soroban (Rust) | ✅ Complete & Verified | Full lifecycle & dispute test suite, WASM compiled |
| **AttestationRegistry Contract** | Soroban (Rust) | ✅ Complete & Verified | 18 unit tests passing, WASM compiled |
| **TypeScript SDK** | `@herledger/sdk` | ✅ Complete & Verified | Type-safe contract clients, XDR codecs, RPC client |
| **Web DApp (Next.js 16)** | `apps/web` | ✅ Complete & Verified | 32/32 Playwright E2E tests passing, responsive UI |
| **Freighter Wallet Integration** | `@stellar/freighter-api`| ✅ Complete & Verified | Non-custodial transaction signing flow tested |
| **Indexer Service** | Fastify + Stellar SDK | ✅ Complete & Verified | Ledger observer, auto-checkpointing, Prometheus |
| **Database & ORM** | PostgreSQL 16 + Prisma | ✅ Complete & Verified | Full migrations applied, relational integrity enforced |
| **Continuous Integration** | GitHub Actions | ✅ 100% Green | 6 automated pipeline jobs passing on every push |

---

## Grant Roadmap & Milestones

```
[Phase 1: Core Protocol MVP] ────▶ [Phase 2: Testnet Pilot] ────▶ [Phase 3: Mainnet Launch] ────▶ [Phase 4: ZK & Lending]
      (COMPLETED & GREEN)               (Months 1-3)                   (Months 4-6)                  (Months 7-9)
```

### Phase 1: Core Protocol Architecture & MVP (Completed ✅)
- [x] Design and implement 3 Soroban smart contracts (`BusinessRegistry`, `FinancialLedger`, `AttestationRegistry`).
- [x] Pass 100% of contract unit tests with clean Clippy and formatting checks.
- [x] Generate TypeScript SDK clients with automated contract ABI verification.
- [x] Build Next.js 16 web application with Better Auth session security.
- [x] Implement Fastify indexer with structured Pino logging and Prometheus metrics.
- [x] Achieve 100% green CI pipeline with 32 automated Playwright E2E tests.

### Phase 2: Stellar Testnet Public Pilot & Attester Onboarding (Months 1–3)
- [ ] Deploy smart contracts to Stellar Testnet with permanent deployed addresses.
- [ ] Onboard 50 pilot women-owned businesses in partner regional markets (e.g. East & West Africa).
- [ ] Implement Attester Portal UI for partner NGOs, microfinance cooperatives, and supplier networks.
- [ ] Conduct user testing workshops to refine low-bandwidth mobile responsiveness.
- [ ] Publish developer documentation and interactive API sandbox.

### Phase 3: Smart Contract Security Audit & Mainnet Launch (Months 4–6)
- [ ] Commission an independent third-party security audit of all Soroban contracts.
- [ ] Implement multi-sig governance and timelock controls for contract upgrades.
- [ ] Deploy production contracts to Stellar Mainnet.
- [ ] Integrate native Stellar anchors for regional fiat on/off-ramps (KES, NGN, BRL, USDC).
- [ ] Launch high-availability indexer cluster with redundant RPC failover.

### Phase 4: Zero-Knowledge Privacy Credentials & MFI Integrations (Months 7–9)
- [ ] Implement Zero-Knowledge proofs (ZK-credentials) allowing entrepreneurs to prove revenue thresholds without revealing transaction histories.
- [ ] Build direct MFI data-sharing connector: exportable verifiable credentials conforming to W3C standards.
- [ ] Partner with 3 microfinance institutions to pilot loan origination backed by HerLedger reputation records.
- [ ] Release Progressive Web App (PWA) offline cache mode for unreliable internet environments.

---

## Evaluator Quickstart (Run & Verify in 5 Mins)

Grant evaluators can inspect and verify the entire repository locally with zero external dependencies:

### 1. Clone the Repository

```bash
git clone https://github.com/Stellar-Deejah/HerLedger.git
cd HerLedger
```

### 2. Verify Smart Contracts (Rust & Soroban)

```bash
cd herledger-contract

# Run all Rust contract test suites
cargo test

# Check formatting and Clippy lints
cargo fmt --check
cargo clippy -- -D warnings

# Build contract WASM bytecode
rustup target add wasm32v1-none
stellar contract build
```

*Expected output: All unit tests pass, and release WASM binaries are generated in `target/wasm32v1-none/release/`.*

### 3. Verify TypeScript Application & E2E Test Suite

```bash
cd ../herledger-app

# Install monorepo dependencies
pnpm install

# Verify TypeScript typecheck
pnpm typecheck

# Run unit and integration tests
pnpm test

# Build production bundles
pnpm build
```

*Expected output: Monorepo compiles cleanly, Next.js web application and indexer build successfully without errors.*

---

## Repository Structure

```
HerLedger/
├── README.md                   Project vision, architecture, status, and quickstart
├── LICENSE                     Apache-2.0 Open Source License
│
├── herledger-contract/         Soroban smart contracts (Rust)
│   ├── contracts/
│   │   ├── business_registry/  On-chain business identity & wallet mapping
│   │   ├── financial_ledger/   Whitelisted assets & event lifecycle management
│   │   └── attestation_registry/ Third-party attestation engine
│   ├── Cargo.toml              Cargo workspace manifest
│   ├── rust-toolchain.toml     Pinned stable Rust toolchain + wasm32v1-none
│   └── README.md               In-depth contract development and deployment guide
│
└── herledger-app/              Application monorepo (TypeScript & Next.js)
    ├── apps/
    │   └── web/                Next.js 16 frontend (App Router, Tailwind, Better Auth)
    ├── packages/
    │   ├── config/             Type-safe Zod environment validation
    │   └── sdk/                Stellar/Soroban client SDK & generated ABIs
    ├── indexer/                Transaction indexing daemon + Fastify metrics API
    ├── prisma/                 PostgreSQL database schema and migration files
    ├── e2e/                    Playwright automated end-to-end test suite (32 tests)
    └── README.md               Monorepo architecture, API reference, and deployment
```

---

## Local Development Setup

For comprehensive local development instructions (including PostgreSQL setup, environment configuration, and running all services concurrently), please refer to:
- [`herledger-contract/README.md`](herledger-contract/README.md) — Contract build, testing, and deployment options.
- [`herledger-app/README.md`](herledger-app/README.md) — Web application, indexer service, and database setup.

### Environment Configuration Template

```env
# Application
NODE_ENV=development
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/herledger_dev

# Better Auth Secret (generate with openssl rand -hex 32)
BETTER_AUTH_SECRET=your_32_byte_secret_here

# Stellar Network
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Indexer
INDEXER_API_URL=http://localhost:4000
```

---

## Observability & Telemetry

HerLedger includes production-grade observability:

- **Structured JSON Logging (Pino)**: Machine-readable logs with timestamps, log levels, service tags, and correlation IDs.
- **Distributed Request Tracing**: End-to-end `x-correlation-id` header propagation across Fastify and async background jobs.
- **Prometheus Metrics (`GET /metrics`)**:
  - `events_indexed_total`: Counter tracking indexed financial events by status and type.
  - `sync_lag_ledgers`: Real-time gauge of indexer sync lag behind the Stellar ledger tip.
  - `rpc_request_duration_seconds`: Histogram of Soroban RPC and Horizon roundtrip latencies.
  - `db_query_duration_seconds`: Histogram measuring Prisma database query performance.

---

## Security, Governance & License

- **Non-Custodial Design**: Private keys never touch HerLedger servers. Signing is performed strictly within the user's browser via Freighter.
- **Tamper-Resistant Storage**: Once a transaction is confirmed on Stellar and indexed, core attributes cannot be modified.
- **Audit-First**: All contracts are tested against reentrancy, unauthorized mutation, and identity spoofing. A professional third-party security audit is scheduled in Milestone 3 before Mainnet deployment.
- **Open Source**: HerLedger is proudly open-source under the **Apache License 2.0**. See [`LICENSE`](LICENSE) for terms.
