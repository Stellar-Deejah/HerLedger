import pLimit from "p-limit";
import { getPrismaClient } from "../db/client.js";
import { getCheckpoint, saveCheckpoint, MAIN_STREAM } from "../db/schema/checkpoint.js";
import { findAllActiveBusinessWallets } from "../db/schema/businesses.js";
import { writeDeadLetter } from "../db/schema/indexer-errors.js";
import { tryClaimWallet, releaseWallet, DEFAULT_LEASE_MS } from "../db/schema/sync-jobs.js";
import { processTransactionForWallet } from "./process-transaction.js";
import { fetchTransactionsForAccount, fetchLatestLedger } from "../stellar/rpc.js";
import { isSuccessfulTransaction, getTransactionLedger } from "../stellar/verification.js";
import {
  getStellarNetworkConfig,
  getContractConfig as getRawContractConfig,
  validateNetworkConsistency,
} from "@herledger/config";
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

// ---------------------------------------------------------------------------
// Main ledger sync job
// Restartable, idempotent, checkpoint-driven.
//
// Scalability model (see README "Indexer" section):
//   - Bounded concurrency: wallets are processed `SYNC_CONCURRENCY` at a time
//     (default 5) within a single process, using an in-process pool rather
//     than worker threads. Worker threads would add serialization/coordination
//     cost without raising the real bottleneck — the Horizon/RPC rate limit —
//     so a small async pool is the right lever.
//   - Per-wallet checkpoints: each wallet tracks its own last-processed ledger
//     in `indexer_checkpoints`, so an idle wallet is skipped without a
//     full-history Horizon scan.
//   - Multi-replica claim locking: before processing, a replica atomically
//     claims the wallet's `sync_jobs` row; a second replica that loses the
//     claim skips the wallet, so replicas never double-process in the same
//     window.
// ---------------------------------------------------------------------------

const SYNC_INTERVAL_MS = 30_000; // 30 seconds between sync cycles
const WALLET_PAGE_SIZE = 100;
const DEFAULT_SYNC_CONCURRENCY = 5;

interface ActiveWallet {
  id: string;
  businessId: string;
  walletAddress: string;
}

export async function runSyncJob(): Promise<void> {
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

  console.log({ job: "sync-ledger", event: "start", network: stellarConfig.network });

  while (true) {
    try {
      await syncCycle(prisma, stellarConfig, contractConfig);
    } catch (err) {
      console.error({
        job: "sync-ledger",
        event: "cycle-error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
    await sleep(SYNC_INTERVAL_MS);
  }
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

  const limit = pLimit(getSyncConcurrency());
  const instanceId = getInstanceId();
  let anyWallets = false;

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

    if (!nextCursor) break;
    walletCursor = nextCursor;
  }

  finishCycleMetrics();

  if (!anyWallets) {
    await saveCheckpoint(prisma, MAIN_STREAM, latestLedger);
    return;
  }
}

async function processWallet(
  wallet: ActiveWallet,
  prisma: ReturnType<typeof getPrismaClient>,
  stellarConfig: ReturnType<typeof getStellarNetworkConfig>,
  contractConfig: ContractConfig,
  latestLedger: number,
  instanceId: string
): Promise<void> {
  // Per-wallet checkpoint: skip entirely when no new ledger has closed since
  // this wallet was last processed (zero Horizon calls for idle wallets).
  const walletCheckpoint = await getCheckpoint(prisma, MAIN_STREAM, wallet.walletAddress);
  if (walletCheckpoint >= latestLedger) {
    return;
  }

  // Multi-replica guard: atomically claim the wallet. If another replica
  // already holds an unexpired lock, skip it this pass.
  const claimed = await tryClaimWallet(prisma, wallet.walletAddress, instanceId, getLeaseMs());
  if (!claimed) {
    console.log({
      job: "sync-ledger",
      event: "wallet-claimed-elsewhere",
      walletAddress: wallet.walletAddress,
    });
    return;
  }

  try {
    await processWalletTransactions(wallet, prisma, stellarConfig, contractConfig, walletCheckpoint);
  } finally {
    await releaseWallet(prisma, wallet.walletAddress, instanceId);
  }
}

async function processWalletTransactions(
  wallet: ActiveWallet,
  prisma: ReturnType<typeof getPrismaClient>,
  stellarConfig: ReturnType<typeof getStellarNetworkConfig>,
  contractConfig: ContractConfig,
  walletCheckpoint: number
): Promise<void> {
  let maxProcessedLedger = walletCheckpoint;
  let txCursor: string | undefined;

  // Walk the wallet's transactions newest-first, stopping at its checkpoint
  // so history older than the last-seen ledger is never re-fetched.
  while (true) {
    const { transactions, nextCursor } = await fetchTransactionsForAccount(
      wallet.walletAddress,
      stellarConfig.horizonUrl,
      { ...(txCursor !== undefined && { cursor: txCursor }), minLedger: walletCheckpoint }
    );

    for (const tx of transactions) {
      const ledger = getTransactionLedger(tx);

      if (!isSuccessfulTransaction(tx)) continue;

      try {
        const outcome = await processTransactionForWallet(
          tx,
          wallet.walletAddress,
          prisma,
          stellarConfig,
          contractConfig
        );
        if (outcome === "indexed") {
          recordIndexed();
        } else {
          recordSkipped();
        }
      } catch (err) {
        recordFailed();
        recordDeadLettered();
        try {
          await writeDeadLetter(prisma, {
            rawXdr: tx.envelope_xdr,
            stage: "index",
            message: err instanceof Error ? err.message : String(err),
            context: { walletAddress: wallet.walletAddress, ledgerSequence: ledger },
          });
        } catch (dlErr) {
          // If we can't even write the dead-letter row, at minimum log it
          // loudly -- this event's failure would otherwise be silently lost.
          console.error({
            job: "sync-ledger",
            event: "dead-letter-write-failed",
            transactionHash: tx.hash,
            originalError: err instanceof Error ? err.message : String(err),
            writeError: dlErr instanceof Error ? dlErr.message : String(dlErr),
          });
        }
        console.error({
          job: "sync-ledger",
          event: "transaction-failed",
          transactionHash: tx.hash,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (ledger > maxProcessedLedger) {
        maxProcessedLedger = ledger;
      }
    }

    if (!nextCursor || transactions.length === 0) break;
    txCursor = nextCursor;
  }

  if (maxProcessedLedger > walletCheckpoint) {
    await saveCheckpoint(prisma, MAIN_STREAM, maxProcessedLedger, wallet.walletAddress);
    console.log({
      job: "sync-ledger",
      event: "wallet-checkpoint-saved",
      walletAddress: wallet.walletAddress,
      ledger: maxProcessedLedger,
    });
  }
}

function getSyncConcurrency(): number {
  const raw = process.env["SYNC_CONCURRENCY"];
  if (!raw) return DEFAULT_SYNC_CONCURRENCY;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.warn({ job: "sync-ledger", event: "invalid-sync-concurrency", value: raw });
    return DEFAULT_SYNC_CONCURRENCY;
  }
  return parsed;
}

function getLeaseMs(): number {
  const raw = process.env["SYNC_LEASE_MS"];
  if (!raw) return DEFAULT_LEASE_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LEASE_MS;
  return parsed;
}

function getInstanceId(): string {
  return process.env["INDEXER_INSTANCE_ID"] ?? `indexer-${process.pid}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
