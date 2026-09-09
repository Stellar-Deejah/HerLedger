import type { PrismaClient } from "@prisma/client";

import { type CheckpointRepository, DatabaseError } from "../types";

export const MAIN_STREAM = "main";
export const EVENTS_STREAM = "contract-events";
export const GLOBAL_WALLET = "global";

/**
 * Read the last processed ledger for a stream.
 * Returns 0 if no checkpoint exists (start from beginning).
 */
export async function getCheckpoint(
  prisma: PrismaClient,
  stream: string,
  walletAddress = GLOBAL_WALLET
): Promise<number> {
  try {
    const checkpoint = await prisma.indexerCheckpoint.findUnique({
      where: { stream_walletAddress: { stream, walletAddress } },
    });
    return checkpoint?.lastLedger ?? 0;
  } catch (cause) {
    throw new DatabaseError(`Failed to read checkpoint for stream ${stream}`, cause);
  }
}

/**
 * Persist a checkpoint for a stream.
 * Creates a new record or updates the existing one atomically.
 */
export async function saveCheckpoint(
  prisma: PrismaClient,
  stream: string,
  lastLedger: number,
  walletAddress = GLOBAL_WALLET
): Promise<void> {
  try {
    await prisma.indexerCheckpoint.upsert({
      where: { stream_walletAddress: { stream, walletAddress } },
      create: { stream, walletAddress, lastLedger },
      update: { lastLedger },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to save checkpoint for stream ${stream}`, cause);
  }
}

export function createCheckpointRepository(prisma: PrismaClient): CheckpointRepository {
  return {
    get: (stream) => getCheckpoint(prisma, stream),
    save: (stream, lastLedger) => saveCheckpoint(prisma, stream, lastLedger),
  };
}
