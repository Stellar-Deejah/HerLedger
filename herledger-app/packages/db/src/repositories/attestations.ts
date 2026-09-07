import type { Attestation, PrismaClient } from "@prisma/client";

import {
  type AttestationsRepository,
  type UpsertAttestationInput,
  type UpsertClaimDescriptionInput,
  DatabaseError,
} from "../types.js";

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
        ...(input.claimDescription !== undefined && { claimDescription: input.claimDescription }),
      },
      update: {
        // Only status (and optionally claimDescription if provided) can change
        status: input.status,
        ...(input.claimDescription !== undefined && { claimDescription: input.claimDescription }),
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to upsert attestation ${input.attestationId}`, cause);
  }
}

export async function upsertClaimDescription(
  prisma: PrismaClient,
  input: UpsertClaimDescriptionInput
): Promise<Attestation> {
  try {
    return await prisma.attestation.upsert({
      where: { attestationId: input.attestationId },
      create: {
        attestationId: input.attestationId,
        eventId: input.eventId,
        attesterAddress: input.attesterAddress,
        claimHash: input.claimHash,
        claimDescription: input.claimDescription,
        status: "Active",
        ledgerSequence: input.ledgerSequence,
      },
      update: {
        claimDescription: input.claimDescription,
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to store claim description for ${input.attestationId}`, cause);
  }
}

export async function findAttestationsByEvent(
  prisma: PrismaClient,
  eventId: string
): Promise<Attestation[]> {
  try {
    return await prisma.attestation.findMany({
      where: { eventId },
      orderBy: { ledgerSequence: "asc" },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find attestations for event ${eventId}`, cause);
  }
}

export async function findAttestationsByBusiness(
  prisma: PrismaClient,
  businessId: string,
  options?: { includeRevoked?: boolean }
): Promise<Attestation[]> {
  try {
    const events = await prisma.financialEvent.findMany({
      where: { businessId },
      select: {
        eventId: true,
        attestations: {
          ...(options?.includeRevoked ? {} : { where: { status: "Active" as const } }),
          orderBy: { ledgerSequence: "desc" },
        },
      },
    });

    return events
      .flatMap((event) => event.attestations)
      .sort((a, b) => b.ledgerSequence - a.ledgerSequence);
  } catch (cause) {
    throw new DatabaseError(`Failed to find attestations for business ${businessId}`, cause);
  }
}

export async function findAttestationById(
  prisma: PrismaClient,
  attestationId: string
): Promise<Attestation | null> {
  try {
    return await prisma.attestation.findUnique({
      where: { attestationId },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find attestation ${attestationId}`, cause);
  }
}

export async function findAttestationByAttestationIdAndBusiness(
  prisma: PrismaClient,
  attestationId: string,
  businessId: string
): Promise<Attestation | null> {
  try {
    return await prisma.attestation.findFirst({
      where: {
        attestationId,
        event: { businessId },
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find attestation ${attestationId} for business ${businessId}`, cause);
  }
}

export function createAttestationsRepository(prisma: PrismaClient): AttestationsRepository {
  return {
    upsert: (input) => upsertAttestation(prisma, input),
    upsertClaimDescription: (input) => upsertClaimDescription(prisma, input),
    findByEvent: (eventId) => findAttestationsByEvent(prisma, eventId),
    findByBusiness: (businessId, options) => findAttestationsByBusiness(prisma, businessId, options),
    findById: (attestationId) => findAttestationById(prisma, attestationId),
    findByAttestationIdAndBusiness: (attestationId, businessId) =>
      findAttestationByAttestationIdAndBusiness(prisma, attestationId, businessId),
  };
}
