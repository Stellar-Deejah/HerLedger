import type { PrismaClient } from "@prisma/client";
import { getAttestation, type StellarNetworkConfig, type ContractConfig } from "@herledger/sdk";
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
