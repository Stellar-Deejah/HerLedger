# Contributing to HerLedger

## Development workflow

1. Fork the repository and create a feature branch.
2. Follow the [local setup](README.md#local-setup) instructions — either
   the manual path or `docker compose up` (see
   [Docker Compose](README.md#option-b-docker-compose)).
3. Make your changes.
4. Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` before committing.
5. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
6. Open a pull request against `main`.

## Pre-commit hooks

The repo uses [husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged)
to catch lint and type errors before they reach CI. This installs automatically
the first time you run `pnpm install` at the repo root (via the `prepare`
script) — there's nothing to run by hand.

On every `git commit`, the hook (`.husky/pre-commit`) runs `lint-staged`, which:

- Runs `eslint --fix` on the staged files, scoped to whichever package(s) they
  belong to (`apps/web`, `indexer`, `packages/config`, `packages/sdk` each
  match independently — see `.lintstagedrc.mjs`). Auto-fixed changes are
  re-staged automatically.
- Runs `pnpm --filter <package> typecheck` for any package that has a staged
  `.ts`/`.tsx` file. TypeScript can't meaningfully check a single file in
  isolation, so this always runs the whole package's `tsc --noEmit` rather
  than per-file — but it only fires for packages that actually have a staged
  change, not the whole monorepo.

If either step reports an error, the commit is blocked and lint-staged
reverts your working tree to its pre-hook state (nothing is lost — fix the
reported issue and commit again).

To skip the hook in an emergency (e.g. a WIP commit on a private branch),
use `git commit --no-verify` — but a PR with lint or type errors will still
fail CI, so don't rely on this to get around real problems.

## Database seeding

`pnpm db:seed` (`prisma/seed.ts`, or `docker compose exec web pnpm db:seed`
if you're on the Docker Compose path) fills a fresh database with
representative data across every model and enum variant — 3 users, 3
business profiles, 20 financial events, 10 attestations — so you have
something to look at in the dashboard without indexing real testnet
activity.

Run it after `pnpm db:migrate:dev` (or once, right after `docker compose
up` finishes bringing the stack healthy). It's upsert-based and keyed on
deterministic IDs, so re-running it never creates duplicates or fails
against data from a previous run — safe to reach for whenever your local
data looks stale. It intentionally does not create Better Auth
`Account`/`Session` rows: seeded users are for browsing data, not for
signing in through the UI.

## Docker Compose

`docker-compose.yml` at the repo root runs the whole stack — Postgres,
web, and the indexer — for contributors who'd rather not install Node/pnpm/
PostgreSQL directly. See [README.md's Docker Compose section](README.md#option-b-docker-compose)
for the commands and the node_modules volume rationale. Source is
bind-mounted for hot reload; it's a development stack, not a production
deployment manifest.

## Commit format

```
type(scope): description

Examples:
feat(sdk): add business registry reads
fix(web): correct wallet disconnect state
chore(repo): update dependencies
test(indexer): cover payment classification
docs(app): improve local setup instructions
```

## Code standards

- TypeScript strict mode — no `any` without explicit justification.
- No secret keys stored anywhere in the codebase.
- No hard-coded contract IDs or RPC URLs — all from environment variables.
- Financial amounts use `bigint` throughout — never `Number` for on-chain values.
- All API routes validate inputs with Zod.
- Blockchain-derived records are immutable after indexing.

## Testing

- Unit tests: `pnpm test`
- Type checking: `pnpm typecheck`
- Formatting: `pnpm format`

### Testing components that call the SDK: `MockSdkProvider`

Components never call `@herledger/sdk` contract functions directly. They go
through `useSdk()` (`apps/web/lib/sdk/sdk-context.tsx`), a React context whose
default value is the real SDK. This is the seam tests use to intercept SDK
calls — **no `vi.mock("@herledger/sdk")` module mocking** — by wrapping the
component under test in `MockSdkProvider` (`apps/web/tests/utils/mock-sdk-provider.tsx`)
and overriding just the function(s) the test needs:

```tsx
import { render, screen } from "@testing-library/react";
import { MockSdkProvider, mockRegisterBusinessSuccess } from "@/tests/utils/mock-sdk-provider";
import { BusinessRegistrationForm } from "@/components/business/business-registration-form";

it("shows the confirmation screen after a successful registration", async () => {
  render(
    <MockSdkProvider overrides={{ registerBusiness: mockRegisterBusinessSuccess("tx-123") }}>
      <BusinessRegistrationForm />
    </MockSdkProvider>
  );
  // ...drive the form, then assert on the confirmed step
});
```

`mock-sdk-provider.tsx` ships a few builders for common outcomes —
`mockRegisterBusinessSuccess()`, `mockRegisterBusinessThrows()`, and
`mockRegisterBusinessRejectedOnChain()` — to simulate the success, thrown
error, and on-chain-failure paths respectively. Adding a new SDK call to a
component means adding it to the `SdkClient` interface in `sdk-context.tsx`
and wiring the real implementation into `defaultSdkClient`; tests then
override it the same way.

Component tests that render into the DOM need the jsdom environment. Add a
`// @vitest-environment jsdom` pragma at the top of the test file — the
project's default Vitest environment stays `node` for speed on non-DOM tests.

## Pull request checklist

- [ ] TypeScript strict mode — no new `any`
- [ ] Tests added or updated
- [ ] No secrets or private keys committed
- [ ] Amounts use `bigint`
- [ ] API inputs validated
- [ ] CI passes

## Database Migrations Governance

HerLedger uses a two-tier database migration system to coordinate structural database changes and data shape transformations safely:

1. **Structural Migrations (Prisma)**
2. **Data Migrations (TypeScript)**

Both are executed automatically in the correct order when running `pnpm db:migrate`.

### 1. Structural Migrations & Baselining

Prisma schema changes are tracked as SQL files in `prisma/migrations/`.
- **Local Development:** When making schema changes to `prisma/schema.prisma`, run:
  ```bash
  pnpm db:migrate:dev
  ```
  This generates a new migration and updates the local database.
- **Production Baselining:** Production and fresh staging environments should run migrations using `pnpm db:migrate`. A baseline migration (`20260820091753_baseline`) is committed to the repository to establish the database schema state. Do not delete or modify existing migration files as it will lead to schema drift and CI failures.

### 2. Data Migrations Framework

When a data shape transformation is required alongside a structural schema change (e.g., backfilling newly added columns), write a data migration.

#### Directory Structure
Data migrations reside in `prisma/data-migrations/` and must follow a sequential numbered naming convention:
- `0001_sample_backfill.ts`
- `0002_split_event_type.ts`

Each migration file must export an `up` function accepting a `PrismaClient` instance:
```typescript
import { PrismaClient } from "@prisma/client";

export async function up(prisma: PrismaClient): Promise<void> {
  // Your data migration logic goes here
}
```

#### Execution and Idempotency
- Structural migrations must run first, followed by data migrations.
- The migration runner (`prisma/data-migrations/runner.ts`) tracks applied migrations in the `data_migrations` database table.
- Each migration is executed once. If a data migration fails, the runner aborts immediately (fail-fast), keeping the database consistent.
- Rollback strategies should be written manually or handled by creating a compensating forward-only migration.

### 3. CI Checks and Pull Requests

CI checks enforce schema and migration sanity:
- **Schema Drift Check:** CI compares the current schema with the committed migrations using `prisma migrate diff`. If a schema change exists without a corresponding migration file, CI will fail.
- **Unsafe Migration Detection:** CI checks for unsafe migrations, such as adding a new `NOT NULL` column without a `DEFAULT` to an existing table. Any such statement will fail CI to prevent downtime or deployment errors.

- [ ] CI passes
