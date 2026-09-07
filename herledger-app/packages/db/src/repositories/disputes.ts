import type { Dispute, PrismaClient } from "@prisma/client";

import { type CreateDisputeInput, type DisputesRepository, DatabaseError } from "../types.js";

export async function findDisputeByEventId(
  prisma: PrismaClient,
  eventId: string
): Promise<Dispute | null> {
  try {
    return await prisma.dispute.findFirst({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to find dispute for event ${eventId}`, cause);
  }
}

export async function createDispute(
  prisma: PrismaClient,
  data: CreateDisputeInput
): Promise<Dispute> {
  try {
    return await prisma.dispute.create({
      data: {
        eventId: data.eventId,
        userId: data.userId,
        reasonPlaintext: data.reasonPlaintext,
        reasonHash: data.reasonHash,
        status: data.status ?? "Submitted",
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to create dispute for event ${data.eventId}`, cause);
  }
}

export function createDisputesRepository(prisma: PrismaClient): DisputesRepository {
  return {
    findByEventId: (eventId) => findDisputeByEventId(prisma, eventId),
    create: (data) => createDispute(prisma, data),
  };
}
