import { Horizon } from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------------
// Transaction verification utilities
// ---------------------------------------------------------------------------

/**
 * Verify that a Horizon transaction record represents a successful transaction.
 * Failed transactions must never be classified as HerLedger financial events.
 */
export function isSuccessfulTransaction(tx: Horizon.ServerApi.TransactionRecord): boolean {
  return tx.successful === true;
}

/**
 * Extract the source account from a transaction.
 */
export function getTransactionSource(tx: Horizon.ServerApi.TransactionRecord): string {
  return tx.source_account;
}

/**
 * Extract the ledger sequence from a transaction's creation timestamp context.
 * Horizon provides ledger via the ledger_attr field.
 */
export function getTransactionLedger(tx: Horizon.ServerApi.TransactionRecord): number {
  return tx.ledger_attr;
}
