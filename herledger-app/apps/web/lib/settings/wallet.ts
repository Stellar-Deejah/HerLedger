import type { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Linked wallet management — unlink / re-link a business's wallet from the
// settings panel.
//
// Both actions are blocked while the business has an active dispute
// (FinancialEvent.status === "Disputed"): a dispute is an on-chain claim
// tied to the wallet that recorded/received the disputed event, and letting
// the owner swap that association out from under an open dispute would
// break the audit trail an admin/attester needs to resolve it. Once every
// dispute on the business is Verified/Revoked (no longer Disputed), the
// guard clears automatically — there is no separate "unlock" step.
// ---------------------------------------------------------------------------

/**
 * True if `businessId` has at least one FinancialEvent currently in the
 * Disputed state. Used to gate wallet unlink/re-link.
 */
export async function hasActiveDisputes(
  prisma: PrismaClient,
  businessId: string
): Promise<boolean> {
  const count = await prisma.financialEvent.count({
    where: { businessId, status: "Disputed" },
  });
  return count > 0;
}

export class ActiveDisputeError extends Error {
  readonly kind = "ActiveDisputeError" as const;
  constructor() {
    super(
      "This business has an active dispute. Resolve it before unlinking or re-linking a wallet."
    );
    this.name = "ActiveDisputeError";
  }
}

/**
 * Unlinks the current wallet from a business profile. Throws
 * ActiveDisputeError if the business has a dispute in progress.
 */
export async function unlinkBusinessWallet(
  prisma: PrismaClient,
  businessId: string
): Promise<void> {
  if (await hasActiveDisputes(prisma, businessId)) {
    throw new ActiveDisputeError();
  }
  await prisma.businessProfile.update({
    where: { businessId },
    data: { walletAddress: null },
  });
}

/**
 * Re-links (or initially links) `walletAddress` to a business profile,
 * after the caller has already verified a signed ownership challenge for
 * it (see @herledger/sdk's verifyWalletLinkChallengeSignature). Throws
 * ActiveDisputeError if the business has a dispute in progress.
 */
export async function relinkBusinessWallet(
  prisma: PrismaClient,
  businessId: string,
  walletAddress: string
) {
  if (await hasActiveDisputes(prisma, businessId)) {
    throw new ActiveDisputeError();
  }
  return prisma.businessProfile.update({
    where: { businessId },
    data: { walletAddress },
  });
}
