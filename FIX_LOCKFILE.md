# Lockfile Regeneration Required

## Problem
The `pnpm-lock.yaml` in origin/main is outdated and missing the `packages/db` workspace package that exists in the repository.

## Current Lockfile State
- ✅ Has: `.`, `apps/web`, `indexer`, `packages/config`, `packages/sdk`
- ❌ Missing: `packages/db`

## Why This Happened
The `packages/db` package was added to the repository but the lockfile was never regenerated to include it.

## Solution

The lockfile needs to be regenerated with all current packages. Run this in an environment with good network connectivity:

```bash
cd herledger-app
rm pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: regenerate pnpm-lock.yaml to include packages/db"
git push origin main
```

## Alternative: Use GitHub Actions

Create a PR that triggers CI to regenerate the lockfile:

1. Remove the `--frozen-lockfile` flag temporarily in `.github/workflows/ci.yml`
2. Let CI regenerate the lockfile
3. Commit the updated lockfile
4. Restore the `--frozen-lockfile` flag

## Temporary Workaround

Until the lockfile is regenerated, you can install without the frozen lockfile check:

```bash
pnpm install --no-frozen-lockfile
```

⚠️ **Note**: CI will fail with `--frozen-lockfile` until this is fixed.

## Root Cause
Local network timeouts prevented regenerating the lockfile. The lockfile needs to be regenerated in an environment with stable network connectivity.
