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

export interface ParsedPayment {
  transactionHash: string;
  ledgerSequence: number;
  successful: boolean;
  sourceAddress: string;
  destinationAddress: string;
  assetAddress: string;
  amount: bigint;
}
