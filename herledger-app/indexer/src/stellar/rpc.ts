import { rpc as StellarRpc, Horizon } from "@stellar/stellar-sdk";
import { getSorobanRpcServer } from "@herledger/sdk";
import type { StellarNetworkConfig } from "@herledger/sdk";
import { rpcRequestDurationSeconds } from "../observability/index.js";
import { retryWithBackoff } from "./retry.js";

// ---------------------------------------------------------------------------
// Stellar RPC helpers for the indexer
// ---------------------------------------------------------------------------

/**
 * Fetch all transactions for a given Stellar address page by page via Horizon.
 * Returns transactions in ascending order from the given cursor.
 * Retries with exponential backoff on transient RPC failures.
 */
export async function fetchTransactionsForAccount(
  address: string,
  horizonUrl: string,
  cursor?: string
): Promise<{
  transactions: Horizon.ServerApi.TransactionRecord[];
  nextCursor: string | undefined;
}> {
  return retryWithBackoff(async () => {
    const timer = rpcRequestDurationSeconds.startTimer({ operation: "fetch_transactions" });
    const server = new Horizon.Server(horizonUrl, { allowHttp: horizonUrl.startsWith("http://") });

    try {
      let builder = server
        .transactions()
        .forAccount(address)
        .order("asc")
        .limit(100)
        .includeFailed(false);

      if (cursor) {
        builder = builder.cursor(cursor);
      }

      const page = await builder.call();
      const records = page.records;
      const nextCursor =
        records.length > 0 ? (records[records.length - 1]?.paging_token ?? undefined) : undefined;

      timer({ status: "success" });
      return { transactions: records, nextCursor };
    } catch (cause) {
      timer({ status: "error" });
      throw cause;
    }
  }, `fetchTransactionsForAccount(${address})`);
}

/**
 * Fetch every operation belonging to a transaction, page by page. Horizon's
 * transaction record only links to its operations (`tx.operations()`) rather
 * than embedding them, so this must be a separate round trip -- callers that
 * need to see *all* operations in a (possibly multi-operation) transaction,
 * such as `parsePaymentsFromTransaction`, fetch this list explicitly instead
 * of relying on whatever the first page of a lazy call happens to contain.
 */
export async function fetchOperationsForTransaction(
  transactionHash: string,
  horizonUrl: string
): Promise<Horizon.ServerApi.OperationRecord[]> {
  const timer = rpcRequestDurationSeconds.startTimer({ operation: "fetch_operations" });
  const server = new Horizon.Server(horizonUrl, { allowHttp: horizonUrl.startsWith("http://") });

  try {
    const operations: Horizon.ServerApi.OperationRecord[] = [];
    let page = await server
      .operations()
      .forTransaction(transactionHash)
      .limit(200)
      .order("asc")
      .call();

    while (page.records.length > 0) {
      operations.push(...page.records);
      // Soroban's `CollectionPage.next()` re-issues the call against the
      // page's own `next` link, so this terminates once Horizon returns an
      // empty page rather than looping on a stale cursor.
      if (page.records.length < 200) break;
      page = await page.next();
    }

    timer({ status: "success" });
    return operations;
  } catch (cause) {
    timer({ status: "error" });
    throw new IndexerError(`Failed to fetch operations for transaction ${transactionHash}`, cause);
  }
}

/**
 * Fetch the latest ledger sequence from the Soroban RPC.
 * Retries with exponential backoff on transient RPC failures.
 */
export async function fetchLatestLedger(config: StellarNetworkConfig): Promise<number> {
  return retryWithBackoff(async () => {
    const timer = rpcRequestDurationSeconds.startTimer({ operation: "fetch_latest_ledger" });
    const server = getSorobanRpcServer(config);
    try {
      const result = await server.getLatestLedger();
      timer({ status: "success" });
      return result.sequence;
    } catch (cause) {
      timer({ status: "error" });
      throw cause;
    }
  }, "fetchLatestLedger");
}

/**
 * Fetch Soroban contract events from the RPC for the given ledger range.
 * Retries with exponential backoff on transient RPC failures.
 */
export async function fetchContractEvents(
  contractId: string,
  startLedger: number,
  config: StellarNetworkConfig
): Promise<StellarRpc.Api.GetEventsResponse["events"]> {
  return retryWithBackoff(async () => {
    const timer = rpcRequestDurationSeconds.startTimer({ operation: "fetch_contract_events" });
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
      timer({ status: "success" });
      return result.events;
    } catch (cause) {
      timer({ status: "error" });
      throw cause;
    }
  }, `fetchContractEvents(${contractId}, ledger=${startLedger})`);
}
