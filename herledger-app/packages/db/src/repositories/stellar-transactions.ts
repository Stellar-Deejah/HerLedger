import type { PrismaClient } from "@prisma/client";

import {
  type StellarTransactionsRepository,
  type UpsertStellarTransactionInput,
  DatabaseError,
} from "../types.js";

/**
 * Idempotent insert of a Stellar transaction record.
 */
export async function upsertStellarTransaction(
  prisma: PrismaClient,
  input: UpsertStellarTransactionInput
): Promise<void> {
  try {
    await prisma.stellarTransaction.upsert({
      where: { hash: input.hash },
      create: {
        hash: input.hash,
        ledgerSequence: input.ledgerSequence,
        successful: input.successful,
        sourceAddress: input.sourceAddress,
      },
      // Transaction data is immutable after first insert
      update: {},
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to upsert Stellar transaction ${input.hash}`, cause);
  }
}

export function createStellarTransactionsRepository(
  prisma: PrismaClient
): StellarTransactionsRepository {
  return {
    upsert: (input) => upsertStellarTransaction(prisma, input),
  };
}
