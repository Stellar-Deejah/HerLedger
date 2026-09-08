import type { PrismaClient } from "@prisma/client";
import { DatabaseError } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Claim-based work distribution for multi-replica sync.
//
// Each indexer replica tries to claim a wallet before processing it. The
// claim is a conditional UPDATE guarded by `lockedUntil`: a replica only wins
// the claim when the row is currently unlocked or its lease has expired. The
// `updateMany` WHERE clause is evaluated atomically by Postgres under the
// row lock, so two concurrent replicas can never both claim the same wallet
// in the same sync window.
// ---------------------------------------------------------------------------

export const DEFAULT_LEASE_MS = 60_000; // 60s — one sync pass with headroom

/**
 * Atomically claim a wallet for this replica.
 *
 * Returns `true` if this replica now holds the lock, `false` if another
 * replica holds an unexpired lock (in which case the caller must skip the
 * wallet this pass).
 *
 * @param prisma - Prisma client.
 * @param walletAddress - Stellar address of the wallet to claim.
 * @param instanceId - Unique identifier of this indexer replica.
 * @param leaseMs - Lock lease duration; defaults to {@link DEFAULT_LEASE_MS}.
 */
export async function tryClaimWallet(
  prisma: PrismaClient,
  walletAddress: string,
  instanceId: string,
  leaseMs: number = DEFAULT_LEASE_MS
): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Ensure a row exists so the conditional claim below has something to
      // target. Upsert is a no-op when the row already exists.
      await tx.syncJob.upsert({
        where: { walletAddress },
        create: { walletAddress },
        update: {},
      });

      const now = new Date();
      const expiresAt = new Date(now.getTime() + leaseMs);

      const claimed = await tx.syncJob.updateMany({
        where: {
          walletAddress,
          OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
        },
        data: {
          lockedBy: instanceId,
          lockedUntil: expiresAt,
          lastHeartbeatAt: now,
        },
      });

      return claimed.count === 1;
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to claim wallet ${walletAddress}`, cause);
  }
}

/**
 * Release this replica's lock on a wallet. Only clears the lock if this
 * replica still holds it, so an expired-then-reclaimed lock is never
 * released by the wrong replica.
 */
export async function releaseWallet(
  prisma: PrismaClient,
  walletAddress: string,
  instanceId: string
): Promise<void> {
  try {
    await prisma.syncJob.updateMany({
      where: { walletAddress, lockedBy: instanceId },
      data: { lockedBy: null, lockedUntil: null, lastHeartbeatAt: null },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to release wallet ${walletAddress}`, cause);
  }
}
