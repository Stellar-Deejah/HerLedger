import type { PrismaClient } from "@prisma/client";
import type { StellarNetworkConfig, ContractConfig } from "@herledger/sdk/types";
import { indexPayment } from "../index/financial-events.js";
import type { ParsedPayment } from "../types/index.js";

export interface MinimalTransaction {
  hash: string;
  successful: boolean;
  source_account: string;
  ledger_attr: number;
}

/**
 * Returns "indexed" if a payment was recorded, "skipped" if the transaction
 * had no derivable payment details (e.g. no asset address yet from operation
 * parsing). Throws on any failure -- callers write a dead-letter row.
 * Shared between the live sync job and the dead-letter replay endpoint so
 * both use identical indexing logic.
 */
export async function processTransactionForWallet(
  tx: MinimalTransaction,
  walletAddress: string,
  prisma: PrismaClient,
  stellarConfig: StellarNetworkConfig,
  contractConfig: ContractConfig
): Promise<"indexed" | "skipped"> {
  const payment: ParsedPayment = {
    transactionHash: tx.hash,
    ledgerSequence: tx.ledger_attr,
    successful: tx.successful,
    sourceAddress: tx.source_account,
    destinationAddress: walletAddress,
    assetAddress: "", // populated from operation parsing
    amount: 0n, // populated from operation parsing
  };

  if (payment.assetAddress) {
    await indexPayment(prisma, payment, stellarConfig, contractConfig);
    return "indexed";
  }
  return "skipped";
}
