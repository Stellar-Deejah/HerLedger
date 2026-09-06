import { rpc as StellarRpc, Horizon } from "@stellar/stellar-sdk";
import { getSorobanRpcServer } from "@herledger/sdk";
import type { StellarNetworkConfig } from "@herledger/sdk";
import { IndexerError } from "../types/index.js";

// ---------------------------------------------------------------------------
// Stellar RPC helpers for the indexer
// ---------------------------------------------------------------------------

/**
 * Fetch all transactions for a given Stellar address page by page via Horizon.
 * Returns transactions in ascending order from the given cursor.
 */
export async function fetchTransactionsForAccount(
  address: string,
  horizonUrl: string,
  cursor?: string
): Promise<{
  transactions: Horizon.ServerApi.TransactionRecord[];
  nextCursor: string | undefined;
}> {
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

    return { transactions: records, nextCursor };
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
