import type { FinancialEvent, PrismaClient } from "@prisma/client";

import {
  type ActivityQueryOptions,
  type CreateFinancialEventInput,
  type EventStatus,
  type FinancialEventsRepository,
  type FinancialEventsSummary,
  type PaginationOptions,
  DatabaseError,
} from "../types.js";

const VALID_AMOUNT_RE = /^-?\d+$/;

/**
 * Validate that an amount string is a valid i128 integer representation.
 * Must match /^-?\d+$/ — no decimals, no scientific notation, no whitespace.
 * Called before every DB write to prevent non-numeric strings from corrupting
 * the ledger.
 */
function validateAmount(amountStr: string): void {
  if (!VALID_AMOUNT_RE.test(amountStr)) {
    throw new DatabaseError(`Invalid amount format: "${amountStr}" does not match /^-?\d+$/`);
  }
}

export async function upsertFinancialEvent(
  prisma: PrismaClient,
  input: CreateFinancialEventInput
): Promise<void> {
  try {
    const amountStr = input.amount.toString();
    validateAmount(amountStr);

    await prisma.financialEvent.upsert({
      where: { eventId: input.eventId },
      create: {
        businessId: input.businessId,
        eventId: input.eventId,
        eventType: input.eventType,
        assetAddress: input.assetAddress,
        amount: amountStr,
        stellarReference: input.stellarReference,
        metadataHash: input.metadataHash,
        status: input.status,
        ledgerSequence: input.ledgerSequence,
      },
      update: {
        status: input.status,
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to upsert financial event ${input.eventId}`, cause);
  }
}

export async function updateEventStatus(
  prisma: PrismaClient,
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
  offset = 0,
  limit = 20
): Promise<FinancialEvent[]> {
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

export async function findRecentEventsByBusiness(
  prisma: PrismaClient,
  businessId: string,
  options?: ActivityQueryOptions
): Promise<FinancialEvent[]> {
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 20;
  const { startDate, endDate } = options ?? {};

  try {
    return await prisma.financialEvent.findMany({
      where: {
        businessId,
        ...((startDate ?? endDate)
          ? {
              createdAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { ledgerSequence: "desc" },
      skip: offset,
      take: limit,
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to query recent events for business ${businessId}`, cause);
  }
}

export async function findEventById(
  prisma: PrismaClient,
  eventId: string
): Promise<FinancialEvent | null> {
  try {
    return await prisma.financialEvent.findUnique({
      where: { eventId },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find event by id ${eventId}`, cause);
  }
}

export async function findEventsUpdatedAfter(
  prisma: PrismaClient,
  businessId: string,
  after: Date
): Promise<FinancialEvent[]> {
  try {
    return await prisma.financialEvent.findMany({
      where: {
        businessId,
        updatedAt: { gt: after },
      },
      orderBy: { updatedAt: "asc" },
    });
  } catch (cause) {
    throw new DatabaseError(
      `Failed to query events updated after for business ${businessId}`,
      cause
    );
  }
}

export async function findAttestableEvents(
  prisma: PrismaClient,
  pagination?: PaginationOptions
): Promise<FinancialEvent[]> {
  const offset = pagination?.offset ?? 0;
  const limit = pagination?.limit ?? 20;

  try {
    return await prisma.financialEvent.findMany({
      orderBy: { ledgerSequence: "desc" },
      skip: offset,
      take: limit,
    });
  } catch (cause) {
    throw new DatabaseError("Failed to query attestable events", cause);
  }
}

interface SummaryRow {
  total_received: unknown;
  total_sent: unknown;
  pending_count: unknown;
  verified_count: unknown;
  disputed_count: unknown;
  revoked_count: unknown;
}

/** Postgres returns COUNT(*) as bigint (or, over some drivers, a numeric string) -- normalize either to a JS number. */
function toCount(value: unknown): number {
  return Number(value ?? 0);
}

/**
 * Aggregate financial KPIs for a business: total received, total sent, net
 * balance, and a count of events by status -- optionally scoped to a date
 * range (`FinancialEvent.createdAt`).
 *
 * `amount` is stored as `String` (to preserve i128 precision -- see the
 * schema comment on `FinancialEvent.amount`), so a Prisma `aggregate({ _sum
 * })` can't sum it directly (that requires a numeric column). This uses a
 * raw, parameterized query that casts to `numeric` for the sum and back to
 * `text` for the result, so precision survives the round trip -- the
 * `businessId` and date bounds are still passed as query parameters, not
 * interpolated into the SQL string, so this isn't injectable.
 */
export async function summarizeFinancialEvents(
  prisma: PrismaClient,
  businessId: string,
  range?: { startDate?: Date; endDate?: Date }
): Promise<FinancialEventsSummary> {
  const startDate = range?.startDate ?? null;
  const endDate = range?.endDate ?? null;

  try {
    const rows = await prisma.$queryRaw<SummaryRow[]>`
      SELECT
        COALESCE(SUM(amount::numeric) FILTER (WHERE "eventType" = 'PaymentReceived'), 0)::text AS total_received,
        COALESCE(SUM(amount::numeric) FILTER (WHERE "eventType" = 'PaymentSent'), 0)::text AS total_sent,
        COUNT(*) FILTER (WHERE status = 'Pending') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'Verified') AS verified_count,
        COUNT(*) FILTER (WHERE status = 'Disputed') AS disputed_count,
        COUNT(*) FILTER (WHERE status = 'Revoked') AS revoked_count
      FROM financial_events
      WHERE "businessId" = ${businessId}
        AND (${startDate}::timestamptz IS NULL OR "createdAt" >= ${startDate}::timestamptz)
        AND (${endDate}::timestamptz IS NULL OR "createdAt" <= ${endDate}::timestamptz)
    `;

    const row = rows[0];
    const totalReceived = row ? String(row.total_received) : "0";
    const totalSent = row ? String(row.total_sent) : "0";

    return {
      totalReceived,
      totalSent,
      netBalance: (BigInt(totalReceived) - BigInt(totalSent)).toString(),
      countByStatus: {
        Pending: toCount(row?.pending_count),
        Verified: toCount(row?.verified_count),
        Disputed: toCount(row?.disputed_count),
        Revoked: toCount(row?.revoked_count),
      },
    };
  } catch (cause) {
    throw new DatabaseError(
      `Failed to summarize financial events for business ${businessId}`,
      cause
    );
  }
}

export function createFinancialEventsRepository(prisma: PrismaClient): FinancialEventsRepository {
  return {
    upsert: (input) => upsertFinancialEvent(prisma, input),
    updateStatus: (eventId, status) => updateEventStatus(prisma, eventId, status),
    findByBusiness: (businessId, offset, limit) =>
      findEventsByBusiness(prisma, businessId, offset, limit),
    findRecentByBusiness: (businessId, pagination) =>
      findRecentEventsByBusiness(prisma, businessId, pagination),
    findById: (eventId) => findEventById(prisma, eventId),
    findUpdatedAfter: (businessId, after) => findEventsUpdatedAfter(prisma, businessId, after),
    findAttestableEvents: (pagination) => findAttestableEvents(prisma, pagination),
    summarize: (businessId, range) => summarizeFinancialEvents(prisma, businessId, range),
  };
}
