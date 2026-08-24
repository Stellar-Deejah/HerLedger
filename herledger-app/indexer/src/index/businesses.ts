import type { PrismaClient } from "@prisma/client";
import type { StellarNetworkConfig, ContractConfig } from "@herledger/sdk";
import { getBusiness } from "@herledger/sdk";

// ---------------------------------------------------------------------------
// Business indexing — sync on-chain business state to local database
// ---------------------------------------------------------------------------

/**
 * Sync a single business from the on-chain registry to the local DB.
 * Only updates mutable fields (active status).
 */
export async function syncBusinessFromChain(
  prisma: PrismaClient,
  businessId: string,
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<void> {
  const onChain = await getBusiness(businessId, config, contracts);
  if (!onChain) return;

  await prisma.businessProfile.updateMany({
    where: { businessId },
    data: { active: onChain.active },
  });
}
