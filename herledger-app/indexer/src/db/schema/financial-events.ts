import type { Prisma, PrismaClient } from "@prisma/client";
import type { EventType, EventStatus } from "../../types/index.js";
import { DatabaseError } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Financial event repository
// Amount stored as string to preserve i128 precision — never cast to Number.
// ---------------------------------------------------------------------------

/** Prisma client or an interactive-transaction client (both expose the same model API). */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface CreateFinancialEventInput {
  businessId: string;
  eventId: string;
  eventType: EventType;
  assetAddress: string;
  amount: bigint;
  stellarReference: string;
  metadataHash: string;
  status: EventStatus;
  ledgerSequence: number;
}

/**
 * Insert a financial event. Idempotent — ignores duplicate eventId.
 * Blockchain-derived fields are immutable after first insert.
 */
export async function upsertFinancialEvent(
  prisma: DbClient,
  input: CreateFinancialEventInput
): Promise<void> {
  try {
    await prisma.financialEvent.upsert({
      where: { eventId: input.eventId },
      create: {
        businessId: input.businessId,
        eventId: input.eventId,
        eventType: input.eventType,
        assetAddress: input.assetAddress,
        // Store as string — never Number
        amount: input.amount.toString(),
        stellarReference: input.stellarReference,
        metadataHash: input.metadataHash,
        status: input.status,
        ledgerSequence: input.ledgerSequence,
      },
      // On conflict: only update mutable status field, never overwrite blockchain-derived fields
      update: {
        status: input.status,
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to upsert financial event ${input.eventId}`, cause);
  }
}

/**
 * Batch insert of financial events using a single `createMany` round-trip
 * (per-ledger batching). Duplicate `eventId` values — from re-indexing a
 * ledger that was already synced — are skipped via `skipDuplicates: true`
 * (PostgreSQL only), so re-indexing never raises unique-constraint errors.
 *
 * Note: unlike the single-row upsert, this path does not update the mutable
 * `status` field on conflict — it only inserts events that are not already
 * present. Status transitions (Pending → Verified) continue to flow through
 * `updateEventStatus`, which is always called explicitly by the indexer when
 * it observes an on-chain transition, so skipping is safe here.
 */
export async function batchUpsertFinancialEvents(
  prisma: DbClient,
  inputs: CreateFinancialEventInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await prisma.financialEvent.createMany({
      data: inputs.map((input) => ({
        businessId: input.businessId,
        eventId: input.eventId,
        eventType: input.eventType,
        assetAddress: input.assetAddress,
        // Store as string — never Number
        amount: input.amount.toString(),
        stellarReference: input.stellarReference,
        metadataHash: input.metadataHash,
        status: input.status,
        ledgerSequence: input.ledgerSequence,
      })),
      skipDuplicates: true,
    });
  } catch (cause) {
    throw new DatabaseError("Failed to batch upsert financial events", cause);
  }
}

/**
 * Update only the status of an existing financial event.
 * Used when the indexer observes a status transition (e.g. Pending → Verified).
 */
export async function updateEventStatus(
  prisma: DbClient,
  eventId: string,
  status: EventStatus
): Promise<void> {
  try {
    await prisma.financialEvent.update({
      where: { eventId },
      data: { status },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to update status for event ${eventId}`, cause);
  }
}

export async function findEventsByBusiness(
  prisma: PrismaClient,
  businessId: string,
  offset: number,
  limit: number
) {
  try {
    return await prisma.financialEvent.findMany({
      where: { businessId },
      orderBy: { ledgerSequence: "desc" },
      skip: offset,
      take: limit,
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to query events for business ${businessId}`, cause);
  }
}
