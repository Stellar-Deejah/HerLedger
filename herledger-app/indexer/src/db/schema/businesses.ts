import type { PrismaClient } from "@prisma/client";
import { DatabaseError } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Business profile repository (indexer-facing)
// ---------------------------------------------------------------------------

export async function findAllActiveBusinessWallets(
  prisma: PrismaClient
): Promise<{ businessId: string; walletAddress: string }[]> {
  try {
    return await prisma.businessProfile.findMany({
      where: { active: true },
      select: { businessId: true, walletAddress: true },
    });
  } catch (cause) {
    throw new DatabaseError("Failed to query active business wallets", cause);
  }
}

export async function findBusinessByWallet(prisma: PrismaClient, walletAddress: string) {
  try {
    return await prisma.businessProfile.findUnique({
      where: { walletAddress },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find business by wallet ${walletAddress}`, cause);
  }
}

export async function findBusinessById(prisma: PrismaClient, businessId: string) {
  try {
    return await prisma.businessProfile.findUnique({
      where: { businessId },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find business by id ${businessId}`, cause);
  }
}
