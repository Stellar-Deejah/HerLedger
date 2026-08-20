import type { PrismaClient } from "@prisma/client";
import type { StellarNetworkConfig, ContractConfig } from "@herledger/sdk";
import { isSupportedAsset } from "@herledger/sdk";
import { upsertFinancialEvent } from "../db/schema/financial-events.js";
import { upsertStellarTransaction } from "../db/schema/stellar-transactions.js";
import { findBusinessByWallet } from "../db/schema/businesses.js";
import type { ParsedPayment } from "../types/index.js";
import { eventsIndexedTotal } from "../observability/index.js";

// ---------------------------------------------------------------------------
// Financial event indexing logic
// Classifies payments per the HerLedger payment semantics spec:
// - PAYMENT_RECEIVED: successful tx, business wallet is recipient, supported asset
// - PAYMENT_SENT: successful tx, business wallet is sender, supported asset
// ---------------------------------------------------------------------------

/**
 * Process a parsed payment:
 * 1. Verify the transaction succeeded.
 * 2. Verify the asset is supported.
 * 3. Determine direction (RECEIVED or SENT) relative to registered wallets.
 * 4. Upsert idempotently.
 */
export async function indexPayment(
  prisma: PrismaClient,
  payment: ParsedPayment,
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<void> {
  // Only process successful transactions
  if (!payment.successful) return;

  // Verify asset support
  const supported = await isSupportedAsset(payment.assetAddress, config, contracts);
  if (!supported) return;

  // Always record the raw transaction first (idempotent)
  await upsertStellarTransaction(prisma, {
    hash: payment.transactionHash,
    ledgerSequence: payment.ledgerSequence,
    successful: payment.successful,
    sourceAddress: payment.sourceAddress,
  });

  // Check if the recipient is a registered HerLedger business wallet
  const recipientBusiness = await findBusinessByWallet(prisma, payment.destinationAddress);
  if (recipientBusiness) {
    const eventId = deriveEventId(payment.transactionHash, "recv");
    await upsertFinancialEvent(prisma, {
      businessId: recipientBusiness.businessId,
      eventId,
      eventType: "PaymentReceived",
      assetAddress: payment.assetAddress,
      amount: payment.amount,
      stellarReference: payment.transactionHash,
      metadataHash: "0".repeat(64), // off-chain metadata committed separately
      status: "Pending",
      ledgerSequence: payment.ledgerSequence,
    });
    eventsIndexedTotal.inc({ event_type: "PaymentReceived", status: "Pending" });
  }

  // Check if the sender is a registered HerLedger business wallet
  const senderBusiness = await findBusinessByWallet(prisma, payment.sourceAddress);
  if (senderBusiness) {
    const eventId = deriveEventId(payment.transactionHash, "sent");
    await upsertFinancialEvent(prisma, {
      businessId: senderBusiness.businessId,
      eventId,
      eventType: "PaymentSent",
      assetAddress: payment.assetAddress,
      amount: payment.amount,
      stellarReference: payment.transactionHash,
      metadataHash: "0".repeat(64),
      status: "Pending",
      ledgerSequence: payment.ledgerSequence,
    });
    eventsIndexedTotal.inc({ event_type: "PaymentSent", status: "Pending" });
  }
}

/**
 * Derive a deterministic event ID from a transaction hash and direction.
 * This ensures idempotent processing — same input always yields same ID.
 */
function deriveEventId(txHash: string, direction: "recv" | "sent"): string {
  const suffix = direction === "recv" ? "00" : "01";
  // Use first 62 chars of hash + direction suffix = 64 chars (32 bytes hex)
  return txHash.slice(0, 62) + suffix;
}
