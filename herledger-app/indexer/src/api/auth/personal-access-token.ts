import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { hashPersonalAccessToken } from "@herledger/config/tokens";

// ---------------------------------------------------------------------------
// Personal access token (PAT) authentication for the indexer's read-only
// business/financial-data routes.
//
// A HerLedger user creates a token from the web app's settings panel
// (POST /api/settings/tokens); only its HMAC-SHA256 hash is ever stored
// (see packages/config/src/tokens.ts). A third-party tool then presents the
// plaintext token here as `Authorization: Bearer <token>` on every request.
// Because hashing is deterministic and keyed with the same pepper on both
// sides, verification is a single indexed lookup by tokenHash rather than a
// scan-and-compare over every stored token.
// ---------------------------------------------------------------------------

const BEARER_PREFIX = "Bearer ";

export interface AuthenticatedPersonalAccessToken {
  tokenId: string;
  userId: string;
}

/**
 * Extracts the token from an `Authorization: Bearer <token>` header.
 * Returns null for a missing header, wrong scheme, or empty token.
 */
export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader || !authorizationHeader.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies a presented personal access token. Returns the authenticated
 * (tokenId, userId) pair, or null if the token is unrecognized or has been
 * revoked. On success, `lastUsedAt` is updated best-effort — a failure to
 * record usage must never block or fail the caller's request.
 */
export async function verifyPersonalAccessToken(
  prisma: PrismaClient,
  rawToken: string,
  pepper: string
): Promise<AuthenticatedPersonalAccessToken | null> {
  const tokenHash = hashPersonalAccessToken(rawToken, pepper);

  const record = await prisma.personalAccessToken.findUnique({ where: { tokenHash } });
  if (!record || record.revokedAt) {
    return null;
  }

  void prisma.personalAccessToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch((cause: unknown) => {
      console.error({ event: "pat-last-used-update-failed", tokenId: record.id, error: cause });
    });

  return { tokenId: record.id, userId: record.userId };
}

/**
 * Fastify preHandler hook factory: rejects any request without a valid,
 * non-revoked personal access token with 401. On success, attaches the
 * authenticated token to `request.pat` for downstream handlers/logging.
 *
 * Applied to the indexer's business- and transaction-scoped read routes
 * (see api/routes/index.ts) — /health, /supported-assets, and /indexer are
 * left open since they expose no per-business financial data.
 */
export function requirePersonalAccessToken(
  prisma: PrismaClient,
  pepper: string
): preHandlerHookHandler {
  return async function personalAccessTokenPreHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      await reply.status(401).send({
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing bearer token. Expected header: Authorization: Bearer <token>",
        },
      });
      return;
    }

    const authenticated = await verifyPersonalAccessToken(prisma, token, pepper);
    if (!authenticated) {
      await reply.status(401).send({
        data: null,
        error: { code: "UNAUTHORIZED", message: "Invalid or revoked personal access token" },
      });
      return;
    }

    (request as FastifyRequest & { pat?: AuthenticatedPersonalAccessToken }).pat = authenticated;
  };
}
