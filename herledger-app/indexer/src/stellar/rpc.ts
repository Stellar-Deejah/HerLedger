import { rpc as StellarRpc, Horizon } from "@stellar/stellar-sdk";
import { getSorobanRpcServer } from "@herledger/sdk";
import type { StellarNetworkConfig } from "@herledger/sdk";
import { IndexerError } from "../types/index.js";
import { getTransactionLedger } from "./verification.js";

// ---------------------------------------------------------------------------
// Stellar RPC helpers for the indexer
// ---------------------------------------------------------------------------

/**
 * Fetch transactions for a given Stellar address page by page via Horizon.
 *
 * Pages are fetched in descending order (newest first) so that, when a
 * `minLedger` checkpoint is supplied, the walk stops as soon as it reaches a
 * transaction at or below that ledger. A wallet whose checkpoint is current
 * therefore issues a single Horizon call that returns no new transactions,
 * instead of re-scanning its entire history.
 *
 * @param address - Stellar account to query.
 * @param horizonUrl - Horizon server URL.
 * @param options - `cursor` to resume pagination, and `minLedger` to bound the
 *   walk at the wallet's last-seen ledger.
 */
export async function fetchTransactionsForAccount(
  address: string,
  horizonUrl: string,
  options: { cursor?: string; minLedger?: number } = {}
): Promise<{
  transactions: Horizon.ServerApi.TransactionRecord[];
  nextCursor: string | undefined;
}> {
  const server = new Horizon.Server(horizonUrl, { allowHttp: horizonUrl.startsWith("http://") });

  try {
    let builder = server
      .transactions()
      .forAccount(address)
      .order("desc")
      .limit(100)
      .includeFailed(false);

    if (options.cursor) {
      builder = builder.cursor(options.cursor);
    }

    const page = await builder.call();
    const records = page.records;

    const { minLedger } = options;
    let transactions = records;
    let reachedCheckpoint = false;

    if (minLedger !== undefined) {
      transactions = [];
      for (const tx of records) {
        if (getTransactionLedger(tx) <= minLedger) {
          reachedCheckpoint = true;
          break;
        }
        transactions.push(tx);
      }
    }

    const nextCursor = reachedCheckpoint
      ? undefined
      : records.length > 0
        ? (records[records.length - 1]?.paging_token ?? undefined)
        : undefined;

    return { transactions, nextCursor };
  } catch (cause) {
    throw new IndexerError(`Failed to fetch transactions for account ${address}`, cause);
  }
}

/**
 * Fetch the latest ledger sequence from the Soroban RPC.
 */
export async function fetchLatestLedger(config: StellarNetworkConfig): Promise<number> {
  const server = getSorobanRpcServer(config);
  try {
    const result = await server.getLatestLedger();
    return result.sequence;
  } catch (cause) {
    throw new IndexerError("Failed to fetch latest ledger from RPC", cause);
  }
}

/**
 * Fetch Soroban contract events from the RPC for the given ledger range.
 */
export async function fetchContractEvents(
  contractId: string,
  startLedger: number,
  config: StellarNetworkConfig
): Promise<StellarRpc.Api.GetEventsResponse["events"]> {
  const server = getSorobanRpcServer(config);
  try {
    const result = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
        },
      ],
      limit: 100,
    });
    return result.events;
  } catch (cause) {
    throw new IndexerError(
      `Failed to fetch events for contract ${contractId} from ledger ${startLedger}`,
      cause
    );
  }
}
