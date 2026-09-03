import pLimit from "p-limit";
import { getPrismaClient } from "../db/client.js";
import { getCheckpoint, saveCheckpoint, MAIN_STREAM } from "../db/schema/checkpoint.js";
import { findAllActiveBusinessWallets } from "../db/schema/businesses.js";
import { writeDeadLetter } from "../db/schema/indexer-errors.js";
import { tryClaimWallet, releaseWallet, DEFAULT_LEASE_MS } from "../db/schema/sync-jobs.js";
import { processTransactionForWallet } from "./process-transaction.js";
import { fetchTransactionsForAccount, fetchLatestLedger } from "../stellar/rpc.js";
import { isSuccessfulTransaction, getTransactionLedger } from "../stellar/verification.js";
import { indexPayment } from "../index/financial-events.js";
import { getStellarNetworkConfig, getContractConfig as getRawContractConfig, validateNetworkConsistency } from "@herledger/config";
import { registerCurrentNetworkAddresses, buildContractConfig, type ContractConfig } from "@herledger/sdk";
import { IndexerError } from "../types/index.js";
import type { ParsedPayment } from "../types/index.js";
import { setInflightSyncPromise } from "../main.js";

// ---------------------------------------------------------------------------
// Main ledger sync job
// Restartable, idempotent, checkpoint-driven.
//
// Accepts an AbortSignal from the shutdown controller so that the graceful
// shutdown handler can drain the current in-progress syncCycle() before
// closing the server and disconnecting Prisma.
import {
  getStellarNetworkConfig,
  getContractConfig as getRawContractConfig,
  validateNetworkConsistency,
} from "@herledger/config/server";
import {
  registerCurrentNetworkAddresses,
  buildContractConfig,
  type ContractConfig,
} from "@herledger/sdk";
import {
  resetCycleMetrics,
  recordIndexed,
  recordFailed,
  recordSkipped,
  recordDeadLettered,
  finishCycleMetrics,
} from "./sync-metrics.js";
import {
  logger,
  generateCorrelationId,
  runWithContext,
  syncLagLedgers,
} from "../observability/index.js";

// ---------------------------------------------------------------------------
// Main ledger sync job
// Restartable, idempotent, per-ledger checkpoint-driven.
// ---------------------------------------------------------------------------

const SYNC_INTERVAL_MS = 30_000; // 30 seconds between sync cycles
const WALLET_PAGE_SIZE = 100;
const DEFAULT_SYNC_CONCURRENCY = 5;

interface ActiveWallet {
  id: string;
  businessId: string;
  walletAddress: string;
}

export async function runSyncJob(signal: AbortSignal): Promise<void> {
  const prisma = getPrismaClient();
  const stellarConfig = getStellarNetworkConfig();
  const rawContractConfig = getRawContractConfig();
  const registry = registerCurrentNetworkAddresses(stellarConfig.network, rawContractConfig);
  const contractConfig = buildContractConfig(registry, stellarConfig.network, rawContractConfig);

  validateNetworkConsistency(
    stellarConfig.network,
    stellarConfig.rpcUrl,
    stellarConfig.networkPassphrase
  );

  logger.info(
    { job: "sync-ledger", event: "start", network: stellarConfig.network },
    "Starting sync ledger job"
  );

  while (!signal.aborted) {
    // Track the in-flight sync cycle so the shutdown handler can await it.
    const cyclePromise = syncCycle(prisma, stellarConfig, contractConfig);
    setInflightSyncPromise(cyclePromise);

    try {
      await cyclePromise;
    } catch (err) {
      console.error({
        job: "sync-ledger",
        event: "cycle-error",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setInflightSyncPromise(null);
    }

    // Interruptible sleep: wake up early if shutdown is requested rather
    // than blocking the grace period for a full 30 s interval.
    if (!signal.aborted) {
      await abortableSleep(SYNC_INTERVAL_MS, signal);
  while (true) {
    const correlationId = generateCorrelationId();
    try {
      await runWithContext({ correlationId, job: "sync-ledger" }, async () => {
        await syncCycle(prisma, stellarConfig, contractConfig);
      });
    } catch (err) {
      logger.error(
        {
          job: "sync-ledger",
          event: "cycle-error",
          correlationId,
          error: err instanceof Error ? err.message : String(err),
        },
        "Error during sync cycle"
      );
    }
  }

  console.log({ job: "sync-ledger", event: "stopped" });
}

async function syncCycle(
  prisma: ReturnType<typeof getPrismaClient>,
  stellarConfig: ReturnType<typeof getStellarNetworkConfig>,
  contractConfig: ContractConfig
): Promise<void> {
  resetCycleMetrics();

  const latestLedger = await fetchLatestLedger(stellarConfig);

  console.log({
    job: "sync-ledger",
    event: "cycle-begin",
    latestLedger,
    concurrency: getSyncConcurrency(),
    instanceId: getInstanceId(),
  });
  const lastCheckpoint = await getCheckpoint(prisma, MAIN_STREAM);
  const initialLag = Math.max(0, latestLedger - lastCheckpoint);
  syncLagLedgers.set(initialLag);

  logger.info(
    {
      job: "sync-ledger",
      event: "cycle-begin",
      lastCheckpoint,
      latestLedger,
      syncLag: initialLag,
    },
    "Beginning ledger sync cycle"
  );

  const limit = pLimit(getSyncConcurrency());
  const instanceId = getInstanceId();
  let anyWallets = false;
  const processedLedgers = new Set<number>();

  // Iterate active business wallets in cursor pages -- never load the full
  // set into memory at once -- but process the wallets within each page with
  // bounded concurrency so a slow wallet doesn't serialize the whole pass.
  let walletCursor: string | undefined;
  while (true) {
    const { wallets, nextCursor } = await findAllActiveBusinessWallets(prisma, {
      ...(walletCursor !== undefined && { cursor: walletCursor }),
      pageSize: WALLET_PAGE_SIZE,
    });

    if (wallets.length > 0) {
      anyWallets = true;
    }

    await Promise.all(
      wallets.map((wallet) =>
        limit(() =>
          processWallet(
            wallet,
            prisma,
            stellarConfig,
            contractConfig,
            latestLedger,
            instanceId
          )
        )
      )
    );
    for (const { walletAddress } of wallets) {
      let txCursor: string | undefined;

      // Paginate through all transactions for this wallet
      while (true) {
        const { transactions, nextCursor: nextTxCursor } = await fetchTransactionsForAccount(
          walletAddress,
          stellarConfig.horizonUrl,
          txCursor
        );

        for (const tx of transactions) {
          const ledger = getTransactionLedger(tx);

          // Only process ledgers after our last checkpoint
          if (ledger <= lastCheckpoint) continue;

          if (!isSuccessfulTransaction(tx)) continue;

          let transactionProcessedSuccessfully = false;

          try {
            const outcome = await processTransactionForWallet(
              tx,
              walletAddress,
              prisma,
              stellarConfig,
              contractConfig
            );
            if (outcome === "indexed") {
              recordIndexed();
            } else {
              recordSkipped();
            }
            transactionProcessedSuccessfully = true;
          } catch (err) {
            recordFailed();
            recordDeadLettered();

            let deadLetterWriteSucceeded = false;
            try {
              await writeDeadLetter(prisma, {
                rawXdr: tx.envelope_xdr,
                stage: "index",
                message: err instanceof Error ? err.message : String(err),
                context: { walletAddress, ledgerSequence: ledger },
              });
              deadLetterWriteSucceeded = true;
            } catch (dlErr) {
              // If we can't even write the dead-letter row, at minimum log it
              // loudly -- this event's failure would otherwise be silently lost.
              logger.error(
                {
                  job: "sync-ledger",
                  event: "dead-letter-write-failed",
                  transactionHash: tx.hash,
                  originalError: err instanceof Error ? err.message : String(err),
                  writeError: dlErr instanceof Error ? dlErr.message : String(dlErr),
                },
                "Failed to write dead letter row"
              );
            }

            logger.error(
              {
                job: "sync-ledger",
                event: "transaction-failed",
                transactionHash: tx.hash,
                error: err instanceof Error ? err.message : String(err),
                deadLetterWriteSucceeded,
              },
              "Transaction processing failed"
            );

            // Only mark the ledger as processed if we successfully wrote the dead letter.
            // If dead-letter write failed, don't add to processedLedgers so the
            // ledger gets retried on the next cycle instead of being silently dropped.
            if (deadLetterWriteSucceeded) {
              transactionProcessedSuccessfully = true;
            }
          }

          // Only add to processedLedgers if both processing and error tracking succeeded.
          // This prevents silent loss of events when the DB is temporarily unavailable.
          if (transactionProcessedSuccessfully && ledger > maxProcessedLedger) {
            maxProcessedLedger = ledger;
            processedLedgers.add(ledger);
          }
        }

        if (!nextTxCursor || transactions.length === 0) break;
        txCursor = nextTxCursor;
      }
    }

    if (!nextCursor) break;
    walletCursor = nextCursor;
  }

  finishCycleMetrics();

  if (!anyWallets) {
    await saveCheckpoint(prisma, MAIN_STREAM, latestLedger);
    syncLagLedgers.set(0);
    return;
  }
}

  // Persist per-ledger checkpoints for each successfully processed ledger.
  // This ensures that on restart, we only re-process ledgers that haven't
  // been fully committed yet. Ledgers are processed in ascending order
  // within each wallet's transaction page.
  if (processedLedgers.size > 0) {
    const sortedLedgers = Array.from(processedLedgers).sort((a, b) => a - b);
    for (const ledger of sortedLedgers) {
      if (ledger > lastCheckpoint) {
        await saveCheckpoint(prisma, MAIN_STREAM, ledger);
      }
    }

    logger.info(
      {
        job: "sync-ledger",
        event: "per-ledger-checkpoints-saved",
        firstLedger: sortedLedgers[0],
        lastLedger: sortedLedgers[sortedLedgers.length - 1],
        count: sortedLedgers.length,
      },
      `Saved per-ledger checkpoints for ${sortedLedgers.length} ledgers`
    );

    syncLagLedgers.set(Math.max(0, latestLedger - maxProcessedLedger));
    logger.info(
      {
        job: "sync-ledger",
        event: "cycle-complete",
        maxProcessedLedger,
        currentLag: Math.max(0, latestLedger - maxProcessedLedger),
      },
      "Sync cycle complete"
    );
  }
}

/**
 * Sleep for `ms` milliseconds, but resolve early if the AbortSignal fires.
 * This keeps the shutdown grace period tight — the sync loop wakes immediately
 * on SIGTERM instead of waiting out the full 30 s inter-cycle gap.
 */
function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
