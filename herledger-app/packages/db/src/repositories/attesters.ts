import type { AttesterProfile, PrismaClient } from "@prisma/client";

import {
  type AttestersRepository,
  type UpsertAttesterInput,
  DatabaseError,
} from "../types.js";

export async function findAttesterByWallet(
  prisma: PrismaClient,
  walletAddress: string
): Promise<AttesterProfile | null> {
  try {
    return await prisma.attesterProfile.findUnique({
      where: { walletAddress },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find attester by wallet ${walletAddress}`, cause);
  }
}

export async function upsertAttester(
  prisma: PrismaClient,
  input: UpsertAttesterInput
): Promise<AttesterProfile> {
  try {
    return await prisma.attesterProfile.upsert({
      where: { walletAddress: input.walletAddress },
      create: {
        walletAddress: input.walletAddress,
        displayName: input.displayName,
        description: input.description ?? null,
        active: input.active ?? true,
      },
      update: {
        displayName: input.displayName,
        description: input.description ?? null,
        active: input.active ?? true,
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to upsert attester profile for ${input.walletAddress}`, cause);
  }
}

export function createAttestersRepository(prisma: PrismaClient): AttestersRepository {
  return {
    findByWallet: (walletAddress) => findAttesterByWallet(prisma, walletAddress),
    upsert: (input) => upsertAttester(prisma, input),
  };
}
