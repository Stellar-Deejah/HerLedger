import { Asset, Horizon } from "@stellar/stellar-sdk";
import type { MinimalTransaction, ParsedPayment } from "../types/index.js";

// ---------------------------------------------------------------------------
// Transaction parsing utilities
// ---------------------------------------------------------------------------

/**
 * Parse a transaction's operations into normalized payment records.
 *
 * Stellar transactions can carry multiple operations; this iterates every
 * operation Horizon returned for the transaction (see
 * `fetchOperationsForTransaction`) and emits one `ParsedPayment` per `payment`
 * operation, rather than stopping at the first -- a multi-operation payout
 * (e.g. paying several vendors in one transaction) would otherwise
 * undercount a business's financial activity.
 *
 * Only classic `payment` operations are handled today (the shape HerLedger's
 * business wallets currently receive funds through); path payments and other
 * operation types are intentionally skipped, not misclassified.
 *
 * Never processes failed transactions, or operations from a different
 * transaction than the one passed in.
 */
export function parsePaymentsFromTransaction(
  tx: MinimalTransaction,
  operations: readonly Horizon.ServerApi.OperationRecord[],
  networkPassphrase: string
): ParsedPayment[] {
  if (!tx.successful) return [];

  const payments: ParsedPayment[] = [];

  for (const op of operations) {
    if (op.transaction_hash !== tx.hash) continue;
    if (!op.transaction_successful) continue;
    if (op.type !== "payment") continue;

    const asset =
      op.asset_type === "native" ? Asset.native() : new Asset(op.asset_code!, op.asset_issuer!);

    payments.push({
      transactionHash: tx.hash,
      ledgerSequence: tx.ledger_attr,
      successful: true,
      sourceAddress: op.from,
      destinationAddress: op.to,
      assetAddress: asset.contractId(networkPassphrase),
      amount: parseAmount(op.amount),
    });
  }

  return payments;
}

/**
 * Determine if a Stellar asset contract address is in the supported set.
 */
export function isSupportedAssetAddress(
  assetAddress: string,
  supportedAssets: Set<string>
): boolean {
  return supportedAssets.has(assetAddress);
}

/**
 * Normalize a Stellar amount string to bigint (preserves i128 precision).
 * Stellar amounts use 7 decimal places (stroops). Contract i128 is raw.
 */
export function parseAmount(rawAmount: string): bigint {
  try {
    return BigInt(rawAmount);
  } catch {
    // Handle decimal amounts from Horizon (e.g. "10.0000000")
    const [whole, decimal] = rawAmount.split(".");
    const decimalPart = (decimal ?? "").padEnd(7, "0").slice(0, 7);
    return BigInt(`${whole ?? "0"}${decimalPart}`);
  }
}
