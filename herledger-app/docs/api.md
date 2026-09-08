# HerLedger API Documentation

HerLedger exposes two REST APIs:

1. **Indexer API (Fastify)**: Exposes indexed on-chain financial history, business profiles, attestations, and Stellar transaction details.
2. **Web API (Next.js)**: Exposes application-level endpoints for business registration, dispute management, recent activity, and real-time SSE event streaming.

---

## API Versioning Policy

All API endpoints follow a path-based versioning scheme prefixed with `/v1/`.

### Endpoints Overview

- **Fastify Indexer API** (default port `4000`):

  - `GET /v1/health` — Indexer & database health status
  - `GET /v1/businesses/:businessId` — Business profile lookup
  - `GET /v1/businesses/:businessId/events` — Paginated financial events for a business
  - `GET /v1/businesses/:businessId/attestations` — Attestations linked to a business's events
  - `GET /v1/supported-assets` — Supported asset metadata
  - `GET /v1/indexer/status` — Indexer checkpoint sequence & cycle metrics
  - `GET /v1/transactions/:hash` — Stellar transaction details
  - `POST /v1/admin/replay/:errorId` — Dead-letter event replay (requires `x-admin-token` header)
  - `GET /v1/openapi.json` — Machine-readable OpenAPI 3.1 Specification

- **Next.js Web API** (default port `3000`):
  - `GET /api/v1/health` — Web API health check
  - `GET /api/v1/activity/recent` — Recent activity list (paginated)
  - `GET /api/v1/attestations` — Business attestations list
  - `POST /api/v1/attestations/:attestationId/resync` — On-demand attestation resync
  - `POST /api/v1/business/register` — Business registration endpoint
  - `POST /api/v1/disputes` — Create dispute against financial event
  - `GET /api/v1/disputes/:eventId` — Retrieve decrypted dispute details (authenticated owner only)
  - `GET /api/v1/events/stream` — Real-time Server-Sent Events (SSE) financial stream
  - `GET /api/openapi.json` — Machine-readable OpenAPI 3.1 Specification

### Unversioned Path Deprecation Strategy

For backward compatibility with existing integrators:

- Requests to unversioned paths (e.g., `/health`, `/businesses/...`, `/api/health`, `/api/activity/recent`) are served or rewritten to their `/v1/` counterparts.
- Unversioned responses include HTTP deprecation headers:
  - `Deprecation: true`
  - `Link: </v1>; rel="successor-version"`

---

## OpenAPI 3.1 Specifications

Both APIs publish machine-readable OpenAPI 3.1 specifications generated from Zod schemas:

- **Fastify Indexer API OpenAPI Spec**: `GET /v1/openapi.json` (also committed at `indexer/openapi.json`)
- **Next.js Web API OpenAPI Spec**: `GET /api/openapi.json` (also committed at `apps/web/public/openapi.json`)

### Spec Drift Prevention

To ensure zero drift between Zod code schemas and published OpenAPI specifications:

- `pnpm openapi:generate` regenerates the committed JSON specifications.
- `pnpm openapi:check` checks that the committed spec files match code schemas.
- GitHub Actions CI validates spec integrity on every pull request (`pnpm openapi:check`). Any breaking schema changes without updated spec files trigger a CI build failure.

---

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured on Next.js API routes (`apps/web/next.config.ts` and `apps/web/middleware.ts`):

- `Access-Control-Allow-Origin` is restricted to `APP_URL` (`http://localhost:3000` in local dev).
- Allowed methods: `GET, POST, PUT, DELETE, OPTIONS`.
- Preflight (`OPTIONS`) requests sent to `/api/*` are handled at the middleware layer returning HTTP `204 No Content`.

---

## API Response Contract

All Web API routes return a standardized envelope:

```ts
type ApiResponse<T> =
  | { data: T; error: null; meta: ApiMeta | null }
  | { data: null; error: ApiError; meta: ApiMeta | null };

type ApiError = { code: string; message: string };
type ApiMeta = {
  requestId?: string;
  timestamp?: string;
  pagination?: { offset: number; limit: number; count: number };
};
```

- On success: `data` is populated, `error` is `null`, `meta` carries pagination when relevant (e.g., `activity/recent`) or is `null`.
- On failure: `data` is `null`, `error` contains `code` and `message`, `meta` is `null`.

### Error Codes

| Code                        | HTTP Status | Meaning                                                                                         |
| --------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `UNAUTHORIZED`              | 401         | Not authenticated — no valid session cookie                                                     |
| `VALIDATION_ERROR`          | 422         | Zod validation failed on body/query — e.g., `limit` > 100, `offset` < 0, malformed `businessId` |
| `INVALID_PARAMS`            | 422         | Invalid query string parameters (legacy alias for `VALIDATION_ERROR`)                           |
| `INVALID_BODY`              | 400         | Malformed JSON body                                                                             |
| `ALREADY_REGISTERED`        | 409         | Business already registered for this account                                                    |
| `WALLET_ALREADY_REGISTERED` | 409         | Wallet address already taken                                                                    |
| `BUSINESS_ID_CONFLICT`      | 409         | `businessId` already exists                                                                     |
| `RATE_LIMITED`              | 429         | Per-user sliding-window limit exceeded (60 req/min) — see `Retry-After`                         |
| `INTERNAL_ERROR`            | 500         | Unexpected server error                                                                         |

Zod validation is colocated in route files for simplicity (e.g., `app/api/activity/recent/route.ts` enforces `limit` ≤ 100 and `offset` ≥ 0). Invalid values return `422` with the structured error body above.

### Rate Limiting

- **Strategy**: Sliding window, 60 requests per 60-second window, per-user (keyed by `userId` from the Better Auth session; unauthenticated callers are bucketed by `x-forwarded-for` IP).
- **Storage**: In-memory `Map` for local dev/test; Vercel KV (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) in production — the `lib/rate-limit.ts` interface is storage-agnostic and falls back to memory if KV is unavailable.
- **Wrapper**: `withRateLimit(handler, { windowMs: 60000, max: 60 })` extracts the user ID safely via `auth.api.getSession({ headers: await headers() })` without interfering with the auth middleware's own session handling; a cached patch ensures the inner handler sees the same session without requiring a second `mockResolvedValueOnce` in tests.
- **Headers**:
  - `Retry-After` (seconds) on `429` — when to retry, derived from the oldest timestamp in the window.
  - `X-RateLimit-Remaining` on all responses — remaining quota in the current window.
  - `X-RateLimit-Reset` (epoch seconds) — when the window resets.
- **Coverage**: Applied to `POST /api/business/register`, `GET /api/attestations`, and `GET /api/activity/recent` (both `/api` and `/api/v1`).

### Health Check

`GET /api/health` and `GET /api/v1/health` return:

```json
{
  "data": {
    "status": "ok | degraded",
    "db": { "healthy": true, "latencyMs": 12, "error": null },
    "indexer": { "healthy": true, "latencyMs": 45, "error": null },
    "version": "0.0.0",
    "rpc": {
      "healthy": true,
      "activeEndpoint": "...",
      "latestLedger": 123,
      "error": null,
      "endpoints": []
    }
  },
  "error": null,
  "meta": null
}
```

- **DB ping**: `SELECT 1` via Prisma with a `2000ms` timeout; `latencyMs` is `null` on failure.
- **Indexer ping**: `GET {INDEXER_API_URL}/v1/health` with a `2000ms` `AbortController` timeout.
- **Version**: Read dynamically from `apps/web/package.json` (`import packageJson from "../../../package.json"`).
- `degraded` if any dependency is unhealthy; otherwise `ok`.

---

## SDK Types

Shared types are exported from `@herledger/sdk`:

```ts
import type { ApiResponse, ApiError, ApiMeta } from "@herledger/sdk";
```
