import type { PrismaClient } from "@prisma/client";
import { DatabaseError } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Stellar transaction repository
// ---------------------------------------------------------------------------

export interface UpsertStellarTransactionInput {
  hash: string;
  ledgerSequence: number;
  successful: boolean;
  sourceAddress: string;
}

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
