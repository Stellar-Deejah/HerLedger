import type { FinancialEvent, PrismaClient } from "@prisma/client";

import {
  type CreateFinancialEventInput,
  type EventStatus,
  type FinancialEventsRepository,
  type PaginationOptions,
  DatabaseError,
} from "../types.js";

export async function upsertFinancialEvent(
  prisma: PrismaClient,
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
        amount: input.amount.toString(),
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
  pagination?: PaginationOptions
): Promise<FinancialEvent[]> {
  const offset = pagination?.offset ?? 0;
  const limit = pagination?.limit ?? 20;

  try {
    return await prisma.financialEvent.findMany({
      where: { businessId },
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
    throw new DatabaseError(`Failed to query events updated after for business ${businessId}`, cause);
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
  };
}
