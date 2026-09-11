# Issue #2: [Account Abstraction & Cryptography] Implement Soroban Passkey (WebAuthn / P-256) Smart Account Wallet Architecture

**Labels**: `GrantFox OSS`, `account-abstraction`, `webauthn`, `smart-contracts`, `sdk`

---

## 1. Technical Problem Statement
The current HerLedger web application interacts with Soroban contracts exclusively via the desktop Freighter extension (`@stellar/freighter-api`), which utilizes ED25519 keypairs. In enterprise and emerging-market field operations, over 95% of target users operate via mobile WebKit/Blink runtimes where extension execution environments do not exist.
- Reliance on external browser extensions blocks mobile-first client interactions and forces users into manual seed phrase management.
- The protocol requires a native **Soroban Smart Account Contract** governed by W3C WebAuthn hardware authenticators (FaceID, TouchID, Android Keystore), verifying **secp256r1 / NIST P-256** signatures directly on Stellar.

---

## 2. Technical Specification & Architecture

### A. Soroban Smart Account Contract (`SmartAccount`)
- Deploy an account contract implementing the `CustomAccount` interface under Soroban SDK:
  ```rust
  pub trait CustomAccountInterface {
      fn __check_auth(
          env: Env,
          signature_payload: Hash<32>,
          signatures: Vec<WebAuthnSignature>,
          auth_contexts: Vec<Context>,
      ) -> Result<(), AccountError>;
  }
  ```
- **Cryptographic Verification**:
  - Implement P-256 signature verification over the SHA-256 digest of client data and authenticator data.
  - Parse `clientDataJSON` and extract the challenge string to ensure replay resistance.
  - Verify WebAuthn authenticator flags (User Presence `UP` and User Verification `UV`).
  - Compare the recovered public key against the registered credential ID in contract instance storage.

### B. Session Key Sub-Authority Delegation
- To prevent biometric prompt fatigue during batch operations, implement a temporary ephemeral session key authority:
  - Ephemeral ED25519 keypair generated in browser memory (`IndexedDB`).
  - Smart account authorizes the session key with an explicit expiration ledger sequence and allowed contract invoke targets (`BusinessRegistry`, `FinancialLedger`).
  - Authorizations automatically expire after $N$ ledgers.

### C. TypeScript SDK Signer Interface (`packages/sdk`)
- Create `PasskeyWalletAdapter` implementing `WalletSignerInterface`:
  - Utilizes `navigator.credentials.create()` for on-chain credential registration.
  - Utilizes `navigator.credentials.get()` for signing transaction authorization hashes.
  - Formats clientDataJSON, authenticatorData, and DER-encoded P-256 signatures into Soroban XDR types (`ScVal`).

---

## 3. Implementation Tasks & Deliverables
- [ ] **Smart Account Contract**: Write `contracts/smart_account/` in Rust using Soroban SDK.
- [ ] **Passkey Client Layer**: Write `packages/sdk/src/wallet/passkey-adapter.ts` with WebAuthn API primitives.
- [ ] **Session Key Manager**: Implement ephemeral session key delegation with storage in browser local keystore.
- [ ] **Frontend Authentication Flow**: Integrate Passkey sign-in and registration components in `apps/web/components/wallet/`.
- [ ] **Security Tests**:
  - Valid signature verification against Soroban host crypto functions.
  - Replay attacks using stale `clientDataJSON` rejected.
  - Expired session key authorizations strictly reverted.
