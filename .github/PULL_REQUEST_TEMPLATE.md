## Summary of Changes

Provide a clear and concise explanation of what this pull request changes and why.

### Related Issue / Bounty
- Closes #
- GrantFox Bounty Task: *(if applicable, paste link)*

---

## Type of Change

- [ ] `feat`: New feature (non-breaking change that adds functionality)
- [ ] `fix`: Bug fix (non-breaking change that fixes an issue)
- [ ] `docs`: Documentation update
- [ ] `refactor`: Code improvement with no functional changes
- [ ] `test`: New or updated tests
- [ ] `chore`: Build/dependency/CI updates

---

## Verification & Testing Checklist

Please check the boxes below confirming that you have verified your changes locally:

### Smart Contracts (if applicable)
- [ ] `cargo test` passes across all contracts (`herledger-contract`)
- [ ] `cargo fmt --check` and `cargo clippy -- -D warnings` pass cleanly
- [ ] `stellar contract build` successfully compiles WASM bytecode

### Application Layer (if applicable)
- [ ] `pnpm typecheck` passes with zero TypeScript errors
- [ ] `pnpm lint` passes cleanly
- [ ] `pnpm test` passes all unit/integration tests
- [ ] `pnpm test:e2e` passes (if changes affect user flows)
- [ ] `pnpm build` completes successfully

### Security & Protocol Invariants
- [ ] No private keys, secrets, or mnemonic seed phrases are committed
- [ ] Financial calculations use `bigint` rather than floating-point numbers
- [ ] All new API inputs and contract parameters are strictly validated

---

## Visual Demonstrations (Screenshots / Videos)

*(If this PR modifies user interfaces, please embed before/after screenshots or a short recording below)*
