# Branch Protection Guide

## Current Branch Structure

- **`main`** — stable, grant-ready production branch
- **`dev`** — development/integration branch for contributors

## Recommended Branch Protection Rules (Manual Setup Required)

GitHub branch protection cannot be configured via API without a personal access
token. Set it up manually at:

**https://github.com/Stellar-Deejah/HerLedger/settings/branches**

### Protect `main`

Add a rule for the `main` branch pattern with these settings:

| Setting | Value |
|---|---|
| Require a pull request before merging | ✅ Enabled |
| Required approvals | 1 (or more for a team) |
| Require status checks to pass before merging | ✅ Enabled |
| Required status checks | `Lint and type check`, `Unit tests`, `Build` |
| Require branches to be up to date before merging | ✅ Enabled |
| Require conversation resolution before merging | ✅ Recommended |
| Restrict who can push to matching branches | Optional — restrict to maintainers |
| Do not allow bypassing the above settings | ✅ Enabled for stricter enforcement |
| Allow force pushes | ❌ Disabled |
| Allow deletions | ❌ Disabled |

### `dev` Branch

`dev` can have lighter protection. Contributors push feature branches and open
PRs against `dev`. A simpler rule:

| Setting | Value |
|---|---|
| Require a pull request before merging | ✅ Enabled |
| Required approvals | 1 |
| Require status checks to pass before merging | ✅ Enabled |
| Required status checks | `Lint and type check`, `Unit tests` |
| Allow force pushes | ❌ Disabled |

## Contributor Workflow

```
main  ← stable, deploy-ready
  ↑
  ← (PR from dev after testing)
  
dev   ← integration branch
  ↑
  ← (PR from feature/xyz branches)

feature/xyz  ← contributor branch (create from dev)
```

1. Contributors create feature branches from `dev`
2. Open a PR targeting `dev`
3. CI runs, reviewer approves, branch merges into `dev`
4. When `dev` is stable and tested, open a PR from `dev` → `main`
5. After merge, `main` is deployable

## CI Checks (Automated)

CI runs on pushes and PRs to both `main` and `dev`:

- **Format check** — Prettier
- **Type check** — TypeScript (5 packages)
- **Lint** — ESLint with strict rules
- **Unit tests** — Vitest with real PostgreSQL
- **Build** — Next.js production build
- **CSS budget check** — gzipped CSS must stay under 50 KB
- **Storybook build** — Component library build verification
- **E2E tests** — Playwright (scheduled)
- **ABI check** — Contract codegen consistency (requires Rust/stellar-cli)
- **Testnet smoke** — Nightly + manual dispatch

The core required checks for merging are:
`Lint and type check`, `Unit tests`, `Build`

The `Contract ABI codegen diff` job requires Stellar CLI compilation and is
a supplementary check — it does not block merges on its own.
