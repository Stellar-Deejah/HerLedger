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
