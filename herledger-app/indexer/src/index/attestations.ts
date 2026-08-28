import type { PrismaClient } from "@prisma/client";
import type { StellarNetworkConfig, ContractConfig } from "@herledger/sdk/types";
import { getAttestation } from "@herledger/sdk/contracts";
import { upsertAttestation } from "../db/schema/attestations.js";

// ---------------------------------------------------------------------------
// Attestation indexing
// ---------------------------------------------------------------------------

/**
 * Sync an attestation from on-chain state into the local database.
 */
export async function syncAttestation(
  prisma: PrismaClient,
  attestationId: string,
  config: StellarNetworkConfig,
  contracts: ContractConfig,
  ledgerSequence: number
): Promise<void> {
  const onChain = await getAttestation(attestationId, config, contracts);
  if (!onChain) return;

  await upsertAttestation(prisma, {
    attestationId: onChain.id,
    eventId: onChain.eventId,
    attesterAddress: onChain.attester,
    claimHash: onChain.claimHash,
    status: onChain.status,
    ledgerSequence,
  });
}
