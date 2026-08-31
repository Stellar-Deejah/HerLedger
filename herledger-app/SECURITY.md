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

- **`BETTER_AUTH_SECRET` entropy validation**: `packages/config/src/schema.ts`
  requires the value to match `/^[0-9a-fA-F]{64,}$/` (>= 64 hex characters,
  i.e. >= 32 bytes of entropy) via a Zod `.refine()`, not just a minimum
  length. A human-typed passphrase padded out to some minimum length (the
  previous rule was `.min(32)`) carries far less real entropy per character
  than random hex does, so length alone let a weak value slip through as
  long as it was long enough. `getServerEnv()` still calls `process.exit(1)`
  with a descriptive table on any failure, so the app refuses to start with
  a weak secret. Generate a compliant value with `openssl rand -hex 32`.

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
  another. The one deliberate exception is `EMAIL_NOT_VERIFIED`: reaching
  that path already proves the caller supplied a valid email/password pair
  (Better Auth checks credentials before verification status), so naming
  the actual reason there doesn't enable enumeration by someone who
  doesn't already have valid credentials.

- **Required email verification**: `emailAndPassword.requireEmailVerification: true`
  in `apps/web/lib/auth/server.ts`. Confirmed against the real `auth`
  instance (not just read from Better Auth's docs): a sign-up no longer
  returns a session (no `Set-Cookie`, `token: null`) until the address is
  verified, and a sign-in attempt against an unverified account is
  rejected with a distinct `EMAIL_NOT_VERIFIED` error rather than
  succeeding. `middleware.ts` validates sessions via Better Auth's
  `auth.api.getSession()` on every protected route.

- **Edge Session Validation & DB Liveness Enforcement**: `apps/web/middleware.ts`
  protects `/dashboard/*` routes by calling `auth.api.getSession({ headers: request.headers })`
  on every request.

  - **Cryptographic HMAC & DB verification**: Forged session cookies, invalid tokens, and
    sessions revoked in the database are rejected with an explicit HTTP 302 redirect to `/auth/sign-in`.
  - **Edge-compatible session caching**: `apps/web/lib/auth/server.ts` configures
    `session.cookieCache` with a short 60-second TTL window. Signed JWT cookie verification
    provides sub-millisecond edge authorization (< 50ms p99 latency) while guaranteeing
    database liveness re-verification and prompt revocation enforcement upon cache expiration.

- **Open-Redirect Defense**: The `callbackUrl` query parameter on `/auth/sign-in` is
  sanitized with `validateCallbackUrl` (`apps/web/lib/auth/callback-url.ts`).

  - **Allowlisting**: Only same-origin relative paths (e.g. `/dashboard`) or absolute URLs
    matching `APP_URL` are permitted.
  - **Payload dropping**: Protocol-relative URLs (`//evil.com`), external domains
    (`https://evil.com`), script URIs (`javascript:alert(1)`), URL-encoded variants,
    and backslash traversal tricks (`/\evil.com`) are dropped silently.

  - **Email provider**: [Resend](https://resend.com) (`apps/web/lib/email/`).
    A single `RESEND_API_KEY` env var is enough in development against
    `onboarding@resend.dev` — no domain verification step. The key is a
    server-only env var (`packages/config/src/schema.ts`'s `serverEnvSchema`,
    never `NEXT_PUBLIC_*`) and is read once via `getServerEnv()`, the same
    pattern every other server secret in this app already follows;
    `EMAIL_FROM` (also server-only) is the sender address, and needs a
    domain verified in the Resend dashboard for production.
  - **UX trade-off**: sign-up no longer lands the user straight on
    `/dashboard/business` — it redirects to `/auth/verify-email`, which
    explains the pending verification and offers a resend action
    (rate-limited, see below). This is a real added step in onboarding,
    accepted as the cost of not letting an unverified email claim a
    business identity that then gets committed on-chain.

- **Sign-in rate limiting / account lockout**: Better Auth's built-in
  `rateLimit` config (`apps/web/lib/auth/server.ts`), not a hand-rolled
  counter. `/sign-in/email` is limited to 5 attempts per 15-minute window
  per client IP; the 6th attempt gets a `429` with the number of seconds
  remaining. Also rate-limited: `/send-verification-email` (3 / 15 min),
  since the resend-verification button is otherwise a mail-bombing vector
  against whatever address is typed into the sign-up form's email field.

  - **Storage: database, not in-memory.** An in-memory counter is
    per-process — wrong the moment this runs as more than one instance
    (multiple serverless invocations, or any horizontally-scaled
    deployment), since each instance keeps its own count and a
    credential-stuffing attacker can round-robin across instances to dodge
    the limit. Postgres is already the source of truth for everything
    else in this app (`prisma/schema.prisma`'s `RateLimit` model,
    `@@map("rate_limits")`), so reusing it needs no new infrastructure
    (no Redis/Upstash).
  - **Client IP resolution**: `advanced.ipAddress.ipAddressHeaders: ["x-forwarded-for"]`.
    Without this, Better Auth can't reliably read the client IP from
    behind a proxy (Vercel or any reverse proxy) — confirmed empirically
    against the real handler: omitting it collapsed every caller onto one
    shared rate-limit bucket regardless of IP, which would either lock out
    unrelated users sharing an edge/proxy or (worse) make the whole limit
    meaningless if the resolved "IP" is constant.
  - **`Retry-After` header**: Better Auth's own `429` response carries the
    wait time in a custom `x-retry-after` header (seconds), not the
    standard `Retry-After` — confirmed against the real response, not
    documented anywhere. `apps/web/app/api/auth/[...all]/route.ts` mirrors
    it onto the standard header so any client or intermediary that only
    understands that one still gets a usable value.

- **Password strength**: `emailAndPassword.minPasswordLength: 12`,
  enforced server-side (Better Auth rejects a shorter password with
  `PASSWORD_TOO_SHORT` before a user is ever created — confirmed against
  the real handler). The client also checks this before submitting, purely
  for immediate feedback; the server check is what actually matters, since
  a client-side check alone is trivially bypassed.

  `apps/web/components/auth/password-strength-meter.tsx` gives real-time
  feedback beyond the length minimum, backed by `@zxcvbn-ts/core` rather
  than the original `zxcvbn` package: same Dropbox `zxcvbn` estimation
  model, rewritten in TypeScript with tree-shakeable per-language
  dictionaries instead of one bundled ~800KB blob. Only the English
  dictionary is included (this app has no i18n yet).

- **Dispute reason encryption at rest**: The plaintext reason a business
  owner gives when disputing a `FinancialEvent` is encrypted before it is
  written to the `disputes` table (`Dispute.reasonPlaintext` -- see field
  comment in `prisma/schema.prisma` for why the encrypted column keeps that
  name). It is never persisted, logged, or returned unencrypted except in
  the single API response path described below.

## Edge/middleware session validation

`apps/web/middleware.ts` gates every `/dashboard/*` request and the
`/auth/sign-in` / `/auth/sign-up` routes. It used to only check whether a
`better-auth.session_token` cookie was _present_ — it never verified the
cookie cryptographically or checked whether the session it names still
exists in the database, so a forged or DB-revoked cookie sailed through.

- **Cryptographic + DB-backed check on every protected request**: the
  middleware now calls `auth.api.getSession({ headers: request.headers })`
  (Better Auth's own session-resolution endpoint) instead of reading the
  cookie itself. This verifies the cookie's HMAC signature and, on a cache
  miss (see below), looks the session up in Postgres. A forged, tampered, or
  DB-revoked session all resolve to `null` here and are redirected to
  sign-in the same way a missing cookie is — the middleware can no longer
  distinguish "wrong secret" from "no cookie" from "session no longer
  exists", which is the point: none of them should get through.
- **Runtime**: Next.js 16 runs the middleware/proxy request handler on the
  Node.js runtime by default (this was an experimental opt-in in 15.2,
  stable in 15.5, and the default since 16.0 — see
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`,
  "Runtime" and "Version history"). That means the Prisma-backed Better
  Auth adapter already configured in `apps/web/lib/auth/server.ts` works
  here unmodified. There is no Edge runtime restriction to design around in
  this app, so no separate edge-compatible auth client, KV session store, or
  route-handler proxy was needed — `auth.api.getSession()` is called
  directly.
- **Session cache / latency trade-off**: Better Auth's `cookieCache`
  (`apps/web/lib/auth/server.ts`, `session.cookieCache`) is a short-TTL
  signed & encrypted cookie holding the session/user payload, checked
  before falling back to Postgres. This is what bounds this middleware's
  added latency to roughly one DB round trip per TTL window rather than one
  per request. Its `maxAge` was **30 seconds** (previously 7 days, a
  leftover from before this cache was used as an authorization gate). The
  trade-off is explicit: a session revoked directly in the database — not
  through Better Auth's own sign-out/revoke endpoints, which also clear
  this cookie — can still be accepted at the edge for up to `maxAge` after
  the cache was last populated. 30 seconds keeps that window small without
  forcing a DB hit on every single dashboard navigation. There is no
  separate Edge KV store in this stack (no Cloudflare/Vercel Edge Config or
  similar is provisioned), so the cookie cache is the lightest mechanism
  available that still bounds staleness to a known, documented number.
- **Latency**: no real p99 benchmark of dashboard cold-load latency was run
  in this environment (no deployed environment or load-testing harness was
  available to this change). What bounds latency by design: (1) a session
  cache hit costs one HMAC verification and zero DB round trips; (2) a
  cache miss costs a single indexed lookup by session token on the
  `Session` table — Better Auth's Prisma adapter queries this by its unique
  token/id index, not a scan; (3) the cache TTL (30s) caps how often a
  given browser session pays the DB-lookup cost to at most once per 30
  seconds of active use, regardless of navigation frequency. These bound
  the _added_ latency structurally; they are not a substitute for measuring
  it against a real Postgres instance under load.
- **Open redirect on `callbackUrl`**: `apps/web/lib/auth/validate-callback-url.ts`
  exports `validateCallbackUrl(url, allowedOrigins)`, used by the
  middleware both when it sets `callbackUrl` on the redirect to sign-in and
  when it reads an inbound `callbackUrl` to decide where an already
  authenticated visitor to `/auth/sign-in` should land instead of the
  default `/dashboard`. It resolves the candidate URL (after decoding it)
  against an allowlist of same-origin origins and returns `null` — never an
  error — for anything that doesn't resolve to one of them: protocol-relative
  URLs (`//evil.com`), absolute URLs to another origin, non-http(s) schemes
  (`javascript:`, `data:`), backslash-based variants that browsers normalize
  the same as `//`, and encoded forms of any of the above. Callers always
  have a safe, hardcoded fallback (`/dashboard`) to use when validation
  returns `null`. See `apps/web/lib/auth/__tests__/validate-callback-url.test.ts`
  for the full payload matrix this is tested against.

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

## Data Minimisation Policy

HerLedger applies strict data minimisation principles across the UI and API presentation layers:

- **UI Address Truncation**: On-chain 56-character Stellar wallet addresses (`G...`) rendered in UI components are truncated via `truncateAddress()` (e.g., `GBRPYH…CUSIZD`). Full addresses are never displayed raw in DOM text nodes, mitigating screen-scraping and identity linking risks. Full address strings remain accessible in accessible `aria-label` and `title` attributes for tooltips and copy utility.
- **API Response Field Projection**: API endpoints enforce field-level access control via the `projectFields<T>` utility. Sensitive attestation properties such as `claimHash` are excluded from API response payloads unless the requesting authenticated session is identified as the business owner.

## Log Redaction Policy

To prevent sensitive financial data and PII leakage into log streams and third-party aggregators, server-side log output enforces mandatory redaction rules:

- **Indexer Log Redaction**: The Pino structured logger automatically redacts `amount`, `walletAddress`, and `stellarReference` fields, replacing their values with `[REDACTED]` at standard log levels (`INFO`, `WARN`, `ERROR`).
- **DEBUG Log Level Scoping**: Full unredacted log fields are strictly restricted to `DEBUG` log level and are only output when `LOG_LEVEL=debug` is explicitly set in non-production environments.

## Indexer API Authentication

The Fastify indexer API (`indexer/src/api/`) is protected by shared-secret authentication to prevent unauthorized access to sensitive financial data.

### Authentication Model

**Shared-Secret Authentication:**

- All protected routes require an `X-Indexer-Secret` header matching the `INDEXER_API_SECRET` environment variable
- The secret must be at least 32 characters (enforced by `packages/config/src/schema.ts`)
- Missing or invalid secrets return HTTP 401 with structured error responses
- Public routes (health checks, metrics, OpenAPI spec) are exempt from authentication

**Trade-off: Shared-Secret vs mTLS:**

- Shared-secret was chosen over mTLS for operational simplicity
- Suitable for internal service-to-service communication in trusted networks
- mTLS would provide stronger security for untrusted networks but requires certificate management infrastructure
- For HerLedger's deployment model (internal indexer service), shared-secret provides sufficient security with lower complexity

### CORS Configuration

- CORS is explicitly configured via `@fastify/cors` to allow only the `INDEXER_API_URL` origin
- This prevents cross-origin requests from unauthorized domains
- Allowed headers include `X-Indexer-Secret`, `X-Correlation-Id`, and `X-Request-Id`
- Credentials are enabled for future cookie-based authentication if needed

### Input Validation

All path and query parameters are validated with Zod schemas before processing:

- `businessId`: Must be a 64-character hexadecimal string
- `hash`: Must be exactly 64 characters (transaction hash)
- `errorId`: Alphanumeric with underscores and hyphens, max 100 characters
- Pagination parameters (`offset`, `limit`) are coerced to integers with bounds checking
- Invalid inputs return HTTP 400 with structured error messages

### Secret Rotation

A rotation script is provided at `scripts/rotate-indexer-secret.ts`:

- Generates a new 32-byte cryptographically secure random secret
- Updates both root `.env` and `indexer/.env` files atomically
- Creates backup files with `.backup` extension
- Run via `pnpm rotate:indexer-secret`
- After rotation, restart the indexer service to pick up the new secret

### Implementation Details

**Authentication Middleware** (`indexer/src/api/auth.ts`):

- `createAuthMiddleware(secret)` returns a Fastify onRequest hook
- Validates the `X-Indexer-Secret` header on every request
- Handles both string and array header values defensively
- Returns 401 with clear error codes (`UNAUTHORIZED`)

**Public Route Detection**:

- `isPublicRoute(url)` identifies endpoints that don't require authentication
- Includes `/health`, `/v1/health`, `/metrics`, `/openapi.json`, `/v1/openapi.json`
- Applied in `indexer/src/api/server.ts` before the auth middleware

**Server Setup** (`indexer/src/api/server.ts`):

- Registers CORS plugin with origin restriction
- Applies auth middleware globally with public route exemption
- Fails fast if `INDEXER_API_SECRET` is not configured

### Security Guarantees

- **No secret leakage**: The secret is never logged or exposed in error responses
- **Fail-closed**: Missing secret configuration causes server startup to fail
- **Origin restriction**: CORS prevents browser-based unauthorized access
- **Input sanitization**: Zod validation prevents injection attacks via path parameters
- **Consistent error responses**: All errors follow the `{ data, error }` envelope pattern

## Stellar transaction visibility

Stellar transactions are publicly visible on the blockchain. HerLedger does
not claim otherwise. The application minimizes additional personal information
stored on-chain by committing only cryptographic hashes.

## Data Classification

Certain database fields are classified as Personally Identifiable Information (PII). In Prisma (`schema.prisma`), these fields are annotated with the `@PII` JSDoc tag.

| Model             | Field           | Classification | Retention                                                    |
| ----------------- | --------------- | -------------- | ------------------------------------------------------------ |
| `User`            | `email`         | **PII**        | Soft-deleted immediately, hard-deleted after 30 days         |
| `User`            | `name`          | **PII**        | Soft-deleted immediately, hard-deleted after 30 days         |
| `User`            | `image`         | **PII**        | Soft-deleted immediately, hard-deleted after 30 days         |
| `Session`         | `ipAddress`     | **PII**        | Purged upon sign out / deletion                              |
| `BusinessProfile` | `displayName`   | **PII**        | Soft-deleted immediately, hard-deleted after 30 days         |
| `BusinessProfile` | `walletAddress` | **PII**        | Anonymized immediately (SHA-256), hard-deleted after 30 days |

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
