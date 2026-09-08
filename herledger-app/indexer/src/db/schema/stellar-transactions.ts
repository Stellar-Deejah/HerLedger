import type { Prisma, PrismaClient } from "@prisma/client";
import { DatabaseError } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Stellar transaction repository
// ---------------------------------------------------------------------------

/** Prisma client or an interactive-transaction client (both expose the same model API). */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface UpsertStellarTransactionInput {
  hash: string;
  ledgerSequence: number;
  successful: boolean;
  sourceAddress: string;
}

/**
 * Idempotent insert of a Stellar transaction record.
 * Transaction data is immutable after first insert.
 */
export async function upsertStellarTransaction(
  prisma: DbClient,
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
      update: {},
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to upsert Stellar transaction ${input.hash}`, cause);
  }
}

/**
 * Batch insert of Stellar transaction records using a single `createMany`
 * round-trip (per-ledger batching). Duplicate `hash` values — from re-indexing
 * a ledger that was already synced — are skipped via `skipDuplicates: true`
 * (PostgreSQL only), so re-indexing never raises unique-constraint errors.
 *
 * Note: unlike the single-row upsert, this path does not update existing rows
 * (transactions are immutable after first insert, so `update: {}` is a no-op
 * anyway).
 */
export async function batchUpsertStellarTransactions(
  prisma: DbClient,
  inputs: UpsertStellarTransactionInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await prisma.stellarTransaction.createMany({
      data: inputs.map((input) => ({
        hash: input.hash,
        ledgerSequence: input.ledgerSequence,
        successful: input.successful,
        sourceAddress: input.sourceAddress,
      })),
      skipDuplicates: true,
    });
  } catch (cause) {
    throw new DatabaseError("Failed to batch upsert Stellar transactions", cause);
  }
}
