import type { PrismaClient } from "@prisma/client";
import type { AttestationStatus } from "../../types/index.js";
import { DatabaseError } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Attestation repository
// ---------------------------------------------------------------------------

export interface UpsertAttestationInput {
  attestationId: string;
  eventId: string;
  attesterAddress: string;
  claimHash: string;
  status: AttestationStatus;
  ledgerSequence: number;
}

export async function upsertAttestation(
  prisma: PrismaClient,
  input: UpsertAttestationInput
): Promise<void> {
  try {
    await prisma.attestation.upsert({
      where: { attestationId: input.attestationId },
      create: {
        attestationId: input.attestationId,
        eventId: input.eventId,
        attesterAddress: input.attesterAddress,
        claimHash: input.claimHash,
        status: input.status,
        ledgerSequence: input.ledgerSequence,
      },
      update: {
        // Only status can change — never overwrite blockchain-derived fields
        status: input.status,
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to upsert attestation ${input.attestationId}`, cause);
  }
}

export async function findAttestationsByEvent(prisma: PrismaClient, eventId: string) {
  try {
    return await prisma.attestation.findMany({
      where: { eventId },
      orderBy: { ledgerSequence: "asc" },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find attestations for event ${eventId}`, cause);
  }
}
