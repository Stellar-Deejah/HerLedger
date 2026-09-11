# Contributing to HerLedger

Thank you for your interest in contributing to **HerLedger**! HerLedger is a non-custodial financial history and identity protocol for women-owned businesses built on the Stellar blockchain and Soroban smart contracts.

We welcome contributions from developers, researchers, designers, and documentation writers across the Web3 and open-source communities.

---

## Table of Contents

1. [GrantFox & Community Bounties](#grantfox--community-bounties)
2. [Repository Structure](#repository-structure)
3. [Prerequisites](#prerequisites)
4. [Development Workflow](#development-workflow)
5. [Testing & Quality Standards](#testing--quality-standards)
6. [Commit Conventions](#commit-conventions)
7. [Submitting Pull Requests](#submitting-pull-requests)
8. [Code of Conduct](#code-of-conduct)

---

## GrantFox & Community Bounties

HerLedger participates in open-source contributor programs powered by **[GrantFox](https://contribute.grantfox.xyz)** and **[Trustless Work](https://trustlesswork.com)**.

### How to Earn Bounties on HerLedger:

1. **Find an Issue**: Browse open issues on our repository tagged with `GrantFox OSS`, `bounty`, or `good first issue`.
2. **Apply & Get Assigned**: Comment on the issue stating your interest and approach. The automated `@grantfox-oss` bot or a maintainer will assign the issue to you.
3. **Submit Your Work**: Open a Pull Request referencing the issue (e.g., `Closes #12`).
4. **Review & Merge**: Maintainers will review your PR and run CI checks. Once merged, your contribution is confirmed, and your bounty reward is released non-custodially on Stellar via Trustless Work escrow!

---

## Repository Structure

The HerLedger codebase is organized as a unified monorepo:

```text
HerLedger/
├── herledger-contract/         Soroban smart contracts (Rust)
│   ├── contracts/
│   │   ├── business_registry/  Identity, ownership, metadata hashes
│   │   ├── financial_ledger/   Asset whitelisting, event lifecycle, disputes
│   │   └── attestation_registry/ Authorized attester claims & verification
│   └── README.md               Contract testing and build instructions
│
└── herledger-app/              Application monorepo (TypeScript / Node.js)
    ├── apps/web/               Next.js 16 frontend (App Router, Better Auth)
    ├── packages/sdk/           Stellar/Soroban TypeScript SDK
    ├── packages/config/        Typed Zod environment validation
    ├── packages/db/            Prisma ORM client & repositories
    ├── indexer/                Transaction indexing daemon + Fastify API
    └── e2e/                    Playwright automated test suite (32 tests)
```

---

## Prerequisites

- **Rust**: `>= 1.84.0` with `wasm32v1-none` target (`rustup target add wasm32v1-none`)
- **Stellar CLI**: `26.1.0` (`cargo install --locked stellar-cli@26.1.0`)
- **Node.js**: `>= 20.9.0` (LTS or Node 22/24 recommended)
- **pnpm**: `>= 9.0.0` (`npm install -g pnpm`)
- **PostgreSQL**: `>= 16` (or Docker Compose)

---

## Development Workflow

### 1. Smart Contracts (`herledger-contract`)

```bash
cd herledger-contract

# Run Rust unit tests
cargo test

# Check formatting and Clippy lints
cargo fmt --check
cargo clippy -- -D warnings

# Build release WASM bytecode
stellar contract build
```

### 2. Application Layer (`herledger-app`)

```bash
cd herledger-app

# Install all monorepo dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run unit and integration tests
pnpm test

# Run TypeScript type check
pnpm typecheck

# Run linter
pnpm lint

# Run end-to-end browser tests
pnpm test:e2e
```

---

## Testing & Quality Standards

Every Pull Request must satisfy our automated quality gates enforced by GitHub Actions:

- **Strict TypeScript**: No implicit or unannotated `any` types.
- **BigInt Financial Precision**: Financial amounts and token values must use `bigint` throughout; never JavaScript `Number` for on-chain values.
- **Input Validation**: All API routes and contract arguments must be rigorously validated using Zod or Soroban type constraints.
- **Zero Key Custody**: Never log, store, transmit, or commit secret keys or private seed phrases. All client transactions must be signed via user wallets (Freighter, Passkeys).
- **100% Green CI**: All 6 CI pipeline jobs (`Contract ABI diff`, `Dependencies`, `Lint/Typecheck`, `Unit tests`, `E2E tests`, `Build`) must pass.

---

## Commit Conventions

HerLedger strictly enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>
```

### Allowed Types:
- `feat`: A new user-facing feature or smart contract function.
- `fix`: A bug fix or contract patch.
- `docs`: Documentation updates or guides.
- `test`: Adding or improving tests (unit, integration, or E2E).
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `chore`: Dependency updates, tooling, or CI workflow changes.

### Examples:
```text
feat(contracts): add selective disclosure verification function
fix(web): resolve mobile viewport overflow on financial activity list
test(sdk): add contract client test vectors for invoice settlement
docs(grantfox): update bounty setup instructions
```

---

## Submitting Pull Requests

1. Create a feature branch from `dev` or `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes with conventional commit messages.
3. Push to your fork and open a Pull Request.
4. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) completely.
5. Ensure all automated GitHub Actions checks turn green. Maintainers will review and merge!

---

## Code of Conduct

We are committed to providing a friendly, welcoming, and harassment-free environment for all contributors, regardless of gender, sexual orientation, disability, ethnicity, or religion. Please be respectful and constructive in all discussions and code reviews.
