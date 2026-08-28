export type { EventType, EventStatus, AttestationStatus } from "@herledger/sdk/types";

export class DatabaseError extends Error {
  readonly kind = "DatabaseError" as const;
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class IndexerError extends Error {
  readonly kind = "IndexerError" as const;
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "IndexerError";
  }
}

/**
 * Raised when a decoded Soroban contract event's XDR structure doesn't match
 * the Zod schema expected for its topic (e.g. the contract was upgraded with
 * a new event shape). A `ParseError` *is an* `IndexerError` so it flows
 * through the exact same dead-letter path (`writeDeadLetter`) as any other
 * indexing failure -- callers don't need a separate catch clause, and the
 * raw event XDR travels with it into the dead-letter row instead of being
 * silently dropped.
 */
export class ParseError extends IndexerError {
  constructor(
    message: string,
    public readonly rawXdr: string,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = "ParseError";
  }
}

export interface ParsedPayment {
  transactionHash: string;
  ledgerSequence: number;
  successful: boolean;
  sourceAddress: string;
  destinationAddress: string;
  assetAddress: string;
  amount: bigint;
}

/**
 * The subset of `Horizon.ServerApi.TransactionRecord` the indexer's parsing
 * and processing functions actually need. Keeping this minimal (rather than
 * depending on the full SDK type everywhere) makes those functions easy to
 * unit test with plain object literals.
 */
export interface MinimalTransaction {
  hash: string;
  successful: boolean;
  source_account: string;
  ledger_attr: number;
}
