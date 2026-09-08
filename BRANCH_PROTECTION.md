# Branch Protection Guide

## How to Protect Your Branch

### 1. **GitHub Branch Protection Rules**

Go to your repository on GitHub and set up branch protection:

1. Navigate to: `https://github.com/Stellar-Deejah/HerLedger/settings/branches`
2. Click "Add rule" or edit existing rules for `main` branch
3. Enable these protections:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (set number of required reviewers)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require signed commits
   - ✅ Include administrators

### 2. **Protect Current Branch from Force Pushes**

Run these commands locally:

```bash
# Prevent force pushes to your branch
git config branch.fix/stabilize-repository.pushRemoteRefsOnly true

# Or protect it at remote level (requires admin access on GitHub)
gh api repos/Stellar-Deejah/HerLedger/branches/fix/stabilize-repository/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci"]}' \
  --field enforce_admins=true
```

### 3. **Create a Pull Request**

Create a PR to merge your branch into main:

```bash
gh pr create \
  --base main \
  --head fix/stabilize-repository \
  --title "fix: stabilize repository and merge origin/main" \
  --body "This PR merges origin/main into fix/stabilize-repository with all conflicts resolved."
```

### 4. **GitHub Settings (Manual)**

Visit: https://github.com/Stellar-Deejah/HerLedger/settings/branches

- Set `main` as protected branch
- Require PR reviews
- Require CI checks to pass
- Disable force pushes

## Current Branch Status

- **Branch:** `fix/stabilize-repository`
- **Status:** Clean, ready for PR
- **Remote:** Up to date with origin
- **Conflicts:** All resolved

## Best Practices

1. **Never force push to main** - Always use PRs
2. **Require reviews** - At least 1 approval before merging
3. **Require CI** - All checks must pass
4. **Keep branches updated** - Merge main into feature branches regularly
5. **Use signed commits** - Verify commit authenticity
