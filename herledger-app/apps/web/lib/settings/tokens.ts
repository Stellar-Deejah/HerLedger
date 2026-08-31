import { generatePersonalAccessToken, hashPersonalAccessToken } from "@herledger/config/tokens";
import type { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Personal access token management — create/list/revoke, backing
// POST /api/settings/tokens and DELETE /api/settings/tokens/[id].
//
// The plaintext token is only ever available at creation time (the return
// value of createPersonalAccessToken). Every other read of a token —
// listing, verifying on the indexer — only ever sees the hash.
// ---------------------------------------------------------------------------

export interface PersonalAccessTokenSummary {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface CreatedPersonalAccessToken extends PersonalAccessTokenSummary {
  /** Plaintext token value — shown once, here, and never again. */
  token: string;
}

/**
 * Creates a new personal access token for `userId`. `pepper` is the
 * server-side secret (BETTER_AUTH_SECRET) used to HMAC-hash the token
 * before it is persisted — see packages/config/src/tokens.ts for why this
 * is peppered SHA-256 rather than a per-token salt.
 */
export async function createPersonalAccessToken(
  prisma: PrismaClient,
  userId: string,
  name: string,
  pepper: string
): Promise<CreatedPersonalAccessToken> {
  const { token, prefix } = generatePersonalAccessToken();
  const tokenHash = hashPersonalAccessToken(token, pepper);

  const record = await prisma.personalAccessToken.create({
    data: { userId, name, tokenHash, prefix },
  });

  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    revokedAt: record.revokedAt,
    token,
  };
}

/** Lists a user's tokens, newest first. Never returns tokenHash. */
export async function listPersonalAccessTokens(
  prisma: PrismaClient,
  userId: string
): Promise<PersonalAccessTokenSummary[]> {
  const rows = await prisma.personalAccessToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });
  return rows;
}

/**
 * Revokes a token immediately by setting `revokedAt`. Scoped to `userId` in
 * the same query (rather than a separate ownership check) so a user can
 * never revoke -- or discover the existence of -- another user's token.
 * Idempotent: revoking an already-revoked token returns `revoked: false`
 * without erroring.
 */
export async function revokePersonalAccessToken(
  prisma: PrismaClient,
  userId: string,
  tokenId: string
): Promise<{ revoked: boolean }> {
  const result = await prisma.personalAccessToken.updateMany({
    where: { id: tokenId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { revoked: result.count > 0 };
}
