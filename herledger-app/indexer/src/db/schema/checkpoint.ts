import type { PrismaClient } from "@prisma/client";
import { DatabaseError } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Indexer checkpoint repository
//
// Checkpoints are keyed by (stream, walletAddress). A `walletAddress` of
// `undefined`/`null` addresses the stream-global checkpoint; a `G...` address
// addresses a per-wallet checkpoint so each business wallet can track its own
// last-processed ledger independently.
// ---------------------------------------------------------------------------

export const MAIN_STREAM = "main";
export const EVENTS_STREAM = "contract-events";

/** Sentinel `walletAddress` for the stream-global (non-wallet-scoped) checkpoint. */
export const GLOBAL_WALLET = "global";

/**
 * Read the last processed ledger for a stream (optionally wallet-scoped).
 * Returns 0 if no checkpoint exists (start from beginning).
 */
export async function getCheckpoint(
  prisma: PrismaClient,
  stream: string,
  walletAddress?: string
): Promise<number> {
  try {
    const checkpoint = await prisma.indexerCheckpoint.findUnique({
      where: { stream_walletAddress: { stream, walletAddress: walletAddress ?? GLOBAL_WALLET } },
    });
    return checkpoint?.lastLedger ?? 0;
  } catch (cause) {
    throw new DatabaseError(`Failed to read checkpoint for stream ${stream}`, cause);
  }
}

/**
 * Persist a checkpoint for a stream (optionally wallet-scoped).
 * Creates a new record or updates the existing one atomically.
 */
export async function saveCheckpoint(
  prisma: PrismaClient,
  stream: string,
  lastLedger: number,
  walletAddress?: string
): Promise<void> {
  try {
    await prisma.indexerCheckpoint.upsert({
      where: { stream_walletAddress: { stream, walletAddress: walletAddress ?? GLOBAL_WALLET } },
      create: { stream, walletAddress: walletAddress ?? GLOBAL_WALLET, lastLedger },
      update: { lastLedger },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to save checkpoint for stream ${stream}`, cause);
  }
}
