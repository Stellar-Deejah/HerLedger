import type { PrismaClient } from "@prisma/client";
import type { StellarNetworkConfig, ContractConfig } from "@herledger/sdk";
import { indexPayment } from "../index/financial-events.js";
import { fetchOperationsForTransaction } from "../stellar/rpc.js";
import { parsePaymentsFromTransaction } from "../stellar/transactions.js";
import type { MinimalTransaction } from "../types/index.js";

/**
 * Returns "indexed" if at least one payment was recorded from this
 * transaction, "skipped" if the transaction had no qualifying payment
 * operations. Throws on any failure -- callers write a dead-letter row.
 * Shared between the live sync job and the dead-letter replay endpoint so
 * both use identical indexing logic.
 *
 * A transaction can carry multiple `payment` operations (e.g. one payout
 * settling several invoices at once); every one of them is indexed, not
 * just the first.
 */
export async function processTransactionForWallet(
  tx: MinimalTransaction,
  walletAddress: string,
  prisma: PrismaClient,
  stellarConfig: StellarNetworkConfig,
  contractConfig: ContractConfig
): Promise<"indexed" | "skipped"> {
  const operations = await fetchOperationsForTransaction(tx.hash, stellarConfig.horizonUrl);
  const allPayments = parsePaymentsFromTransaction(tx, operations, stellarConfig.networkPassphrase);

  // This transaction was fetched because it appears in `walletAddress`'s
  // history; a single transaction can bundle payments to/from other parties
  // too (e.g. a batch payout), so only index the ones that actually involve
  // the wallet this sync cycle is processing.
  const payments = allPayments.filter(
    (payment) =>
      payment.sourceAddress === walletAddress || payment.destinationAddress === walletAddress
  );

  if (payments.length === 0) return "skipped";

  for (const payment of payments) {
    await indexPayment(prisma, payment, stellarConfig, contractConfig);
  }
  return "indexed";
}
