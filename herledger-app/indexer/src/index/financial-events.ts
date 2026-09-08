import type { PrismaClient } from "@prisma/client";
import type { StellarNetworkConfig, ContractConfig } from "@herledger/sdk/types";
import { isSupportedAsset } from "@herledger/sdk/contracts";
import { createHash } from "node:crypto";
import { upsertFinancialEvent } from "../db/schema/financial-events.js";
import { upsertStellarTransaction } from "../db/schema/stellar-transactions.js";
import { findBusinessByWallet } from "../db/schema/businesses.js";
import type { ParsedPayment } from "../types/index.js";
import { eventsIndexedTotal, logger } from "../observability/index.js";

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
 *
 * Transaction boundary: the raw Stellar transaction and any financial events
 * derived from it are written inside a single `prisma.$transaction(...)` so
 * the payment's index is atomic — a failure while writing either the
 * transaction or one of its events rolls back the whole payment, keeping the
 * ledger and the derived events consistent with each other.
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

  // Check if the recipient is a registered HerLedger business wallet
  const recipientBusiness = await findBusinessByWallet(prisma, payment.destinationAddress);

  // Check if the sender is a registered HerLedger business wallet
  const senderBusiness = await findBusinessByWallet(prisma, payment.sourceAddress);

  // Write the raw transaction and its derived events atomically.
  await prisma.$transaction(async (tx) => {
    // Always record the raw transaction first (idempotent)
    await upsertStellarTransaction(tx, {
      hash: payment.transactionHash,
      ledgerSequence: payment.ledgerSequence,
      successful: payment.successful,
      sourceAddress: payment.sourceAddress,
    });

    if (recipientBusiness) {
      const eventId = deriveEventId(payment.transactionHash, "recv");
      await upsertFinancialEvent(tx, {
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
      logger.info(
        {
          event: "financial_event_indexed",
          eventType: "PaymentReceived",
          businessId: recipientBusiness.businessId,
          eventId,
          amount: payment.amount.toString(),
          walletAddress: payment.destinationAddress,
          stellarReference: payment.transactionHash,
        },
        "Financial event indexed"
      );
    }

    if (senderBusiness) {
      const eventId = deriveEventId(payment.transactionHash, "sent");
      await upsertFinancialEvent(tx, {
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
      logger.info(
        {
          event: "financial_event_indexed",
          eventType: "PaymentSent",
          businessId: senderBusiness.businessId,
          eventId,
          amount: payment.amount.toString(),
          walletAddress: payment.sourceAddress,
          stellarReference: payment.transactionHash,
        },
        "Financial event indexed"
      );
    }
  });
}

/**
 * Derive a deterministic event ID from a transaction hash and direction.
 *
 * Algorithm: SHA-256(txHash + ":" + directionSuffix), truncated to 32 bytes
 * (64 hex characters). The direction suffix is "00" for received events and
 * "01" for sent events.
 *
 * This approach is collision-resistant — SHA-256 preimage resistance means
 * finding two distinct (txHash, direction) pairs that produce the same hash
 * is computationally infeasible (2^128 work for collision, 2^256 for
 * preimage). The old truncation-based approach (first 62 hex chars + suffix)
 * had a collision probability of ~2^-8 for adversarial inputs sharing a
 * 31-byte prefix.
 *
 * The algorithm is deterministic: same input always produces the same output,
 * enabling idempotent processing. External tooling can reproduce the
 * derivation by applying the documented formula.
 */
export function deriveEventId(txHash: string, direction: "recv" | "sent"): string {
  const suffix = direction === "recv" ? "00" : "01";
  const input = `${txHash}:${suffix}`;
  return createHash("sha256").update(input).digest("hex");
}
