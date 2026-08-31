import type { FastifyRequest, FastifyReply } from "fastify";

// ---------------------------------------------------------------------------
// Shared-secret authentication middleware for the indexer API
//
// The indexer API is intended to be called only by the Next.js backend, not by
// the public internet. All requests must include an X-Indexer-Secret header that
// matches the INDEXER_API_SECRET environment variable.
//
// Trade-off: Shared-secret vs mTLS
// - Shared-secret: Simpler to implement, no certificate management overhead,
//   suitable for internal service-to-service communication in a trusted network
// - mTLS: More secure for untrusted networks, but requires certificate issuance,
//   rotation, and management infrastructure
//
// For HerLedger's deployment model (internal indexer service), shared-secret
// authentication provides sufficient security with lower operational complexity.
// ---------------------------------------------------------------------------

const AUTH_HEADER = "x-indexer-secret";

export function createAuthMiddleware(secret: string) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const providedSecret = request.headers[AUTH_HEADER];

    if (!providedSecret) {
      return reply.status(401).send({
        data: null,
        error: { code: "UNAUTHORIZED", message: "Missing authentication header" },
      });
    }

    // Handle both string and array header values
    const secretValue = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;

    if (secretValue !== secret) {
      return reply.status(401).send({
        data: null,
        error: { code: "UNAUTHORIZED", message: "Invalid authentication token" },
      });
    }

    // Authentication successful - continue to the route handler
  };
}

// Health check routes should not require authentication
export function isPublicRoute(url: string): boolean {
  const publicPaths = ["/health", "/v1/health", "/metrics", "/openapi.json", "/v1/openapi.json"];
  return publicPaths.some((path) => url.startsWith(path));
}
