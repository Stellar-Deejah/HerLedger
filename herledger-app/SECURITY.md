# Security

## Scope

HerLedger is an MVP application. It has **not been audited**. Do not use in
production for real financial data without a professional security review.

## Key security properties

- **No private key storage**: The application never requests, stores, or
  transmits Stellar private keys. All transaction signing is performed by
  the user's Freighter wallet extension.

- **No secret key logging**: Application logs never contain private keys,
  session secrets, authentication tokens, or full sensitive request bodies.

- **Server-side secrets**: `DATABASE_URL` and `BETTER_AUTH_SECRET` are
  never exposed to browser code. Only `NEXT_PUBLIC_*` values are client-accessible.

- **Input validation**: All API inputs are validated with Zod. No user-provided
  data bypasses validation.

- **Database integrity**: Blockchain-derived fields (transaction hash, amount,
  sender, recipient) are immutable after indexing. They cannot be modified
  through normal API requests.

- **Authentication separation**: Application authentication (Better Auth) is
  separate from wallet connection (Freighter). Wallet connection alone does not
  grant application access.

- **Wallet address trust**: Typed wallet addresses are not trusted as proof
  of ownership. On-chain authorization via Soroban contract calls enforces
  actual ownership.

- **Secure session cookies**: Application sessions use secure HTTP-only cookies.

- **No SQL injection**: All database access uses Prisma's parameterized queries.

- **CSRF protection on auth endpoints**: Better Auth (1.6.x) has no `csrf`
  config flag — its CSRF protection is the Origin/Referer + Fetch Metadata
  check built into its origin-check middleware
  (`formCsrfMiddleware`/`validateOrigin`), and it is applied to
  `/api/auth/sign-in/email` and `/api/auth/sign-up/email` by default. It
  rejects two attack shapes: a cross-site top-level form navigation (the
  browser's own `Sec-Fetch-Site: cross-site` + `Sec-Fetch-Mode: navigate`
  headers, which an attacker page cannot forge, trigger an immediate
  reject) and any other cross-origin request whose `Origin`/`Referer`
  doesn't match `trustedOrigins` (currently `[APP_URL]`).

  One caveat we found and closed: Better Auth auto-disables this check
  whenever `NODE_ENV === "test"` (a testing convenience) — which is
  exactly what CI sets for the whole job. `apps/web/lib/auth/server.ts`
  sets `advanced: { disableOriginCheck: false }` explicitly so a `test`
  `NODE_ENV` can never silently turn the protection off, in CI or
  otherwise. Covered by `apps/web/lib/auth/__tests__/server.csrf.test.ts`.

- **User enumeration resistance on sign-in**: every credential-failure path
  in Better Auth's `signInEmail` (unknown email, no credential account,
  wrong password) already normalizes to the same message
  ("Invalid email or password") server-side and performs a dummy password
  hash on the "not found" path so response timing doesn't distinguish it
  from a wrong-password attempt. `apps/web/lib/auth/messages.ts` adds a
  defensive client-side normalization layer on top, so the sign-in form
  never surfaces a different message verbatim even if a future plugin,
  misconfiguration, or upstream change makes one path more specific than
  another.
- **Dispute reason encryption at rest**: The plaintext reason a business
  owner gives when disputing a `FinancialEvent` is encrypted before it is
  written to the `disputes` table (`Dispute.reasonPlaintext` -- see field
  comment in `prisma/schema.prisma` for why the encrypted column keeps that
  name). It is never persisted, logged, or returned unencrypted except in
  the single API response path described below.

## Dispute reason encryption scheme

Only a hash of the dispute reason (`reason_hash: BytesN<32>`) is submitted
on-chain via `dispute_event`. The plaintext itself is stored off-chain so a
business owner can recall why they disputed an event, and so it can be
reproduced to verify `reason_hash` against the on-chain record -- but it is
sensitive business/financial detail, so it is encrypted at rest.

- **Algorithm**: AES-256-GCM (authenticated encryption -- ciphertext
  tampering is detected, not just prevented).
- **Key derivation**: The AES key is never itself stored. It is derived on
  demand from `BETTER_AUTH_SECRET` using HKDF (RFC 5869, HMAC-SHA256) with
  a fixed, feature-specific `info` string
  (`herledger:dispute-reason:aes-256-gcm:v1`). This means:
  - No separate key management system is needed for this MVP -- the same
    root secret that already protects Better Auth sessions protects dispute
    reasons.
  - HKDF's `info` parameter domain-separates this key from any other key a
    future feature might derive from the same `BETTER_AUTH_SECRET`, even
    though they'd share the same input keying material.
  - Derivation is deterministic: the same secret always yields the same
    key, so existing ciphertexts stay decryptable without a key store.
    Rotating `BETTER_AUTH_SECRET` would require re-encrypting all existing
    `Dispute.reasonPlaintext` rows with the newly-derived key -- there is no
    automatic re-encryption migration for this yet.
- **Nonce**: A fresh random 96-bit IV is generated for every encryption
  call (required for GCM -- a nonce must never be reused with the same
  key). The IV and the GCM authentication tag are stored alongside the
  ciphertext in a single `iv:authTag:ciphertext` (base64 segments) envelope
  string, so no additional columns are needed to decrypt.
- **Implementation**: `apps/web/lib/crypto/dispute-encryption.ts`
  (`encryptDisputeReason` / `decryptDisputeReason`). Decryption failures
  (wrong key, corrupted data, tampered ciphertext or auth tag, malformed
  envelope) always raise a typed `DisputeDecryptionError` -- native
  `node:crypto` exceptions are caught and never propagate unhandled, so a
  bad decrypt cannot crash the server process.
- **Access control**: `GET /api/disputes/:eventId` only decrypts and
  returns `reasonPlaintext` when the requesting session belongs to the
  business owner who filed the dispute. Every other caller -- including an
  unauthenticated request, a different HerLedger user, or the event's
  attester -- gets a 403 with no dispute data at all, not a redacted
  version of the response. Reading a dispute reason back is a capability
  reserved for the party with a legitimate need for it.

## Stellar transaction visibility

Stellar transactions are publicly visible on the blockchain. HerLedger does
not claim otherwise. The application minimizes additional personal information
stored on-chain by committing only cryptographic hashes.

## Data Classification

Certain database fields are classified as Personally Identifiable Information (PII). In Prisma (`schema.prisma`), these fields are annotated with the `@PII` JSDoc tag.

| Model | Field | Classification | Retention |
|-------|-------|----------------|-----------|
| `User` | `email` | **PII** | Soft-deleted immediately, hard-deleted after 30 days |
| `User` | `name` | **PII** | Soft-deleted immediately, hard-deleted after 30 days |
| `User` | `image` | **PII** | Soft-deleted immediately, hard-deleted after 30 days |
| `Session` | `ipAddress` | **PII** | Purged upon sign out / deletion |
| `BusinessProfile` | `displayName` | **PII** | Soft-deleted immediately, hard-deleted after 30 days |
| `BusinessProfile` | `walletAddress` | **PII** | Anonymized immediately (SHA-256), hard-deleted after 30 days |

## Reporting vulnerabilities

If you discover a security vulnerability, please do not open a public issue.
Contact the maintainers privately at the email listed in the repository.

Provide:

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested remediation

We will acknowledge receipt within 48 hours and aim to address critical
vulnerabilities within 14 days.

## Known limitations

- No production security audit has been performed.
- No penetration testing has been conducted.
- Smart contract security relies on the `herledger-contract` audit status.
- This application handles financial history records — treat as financial
  infrastructure and conduct appropriate due diligence before real-value
  deployment.
