import type { IndexerError, PrismaClient } from "@prisma/client";

import {
  type DeadLetterInput,
  type IndexerErrorsRepository,
  DatabaseError,
} from "../types.js";

export async function writeDeadLetter(
  prisma: PrismaClient,
  input: DeadLetterInput
): Promise<{ errorId: string }> {
  try {
    const row = await prisma.indexerError.create({
      data: {
        rawXdr: input.rawXdr,
        stage: input.stage,
        message: input.message,
        context: (input.context ?? undefined) as never,
      },
      select: { errorId: true },
    });
    return row;
  } catch (cause) {
    throw new DatabaseError("Failed to write dead-letter row", cause);
  }
}

export async function findDeadLetterByErrorId(
  prisma: PrismaClient,
  errorId: string
): Promise<IndexerError | null> {
  try {
    return await prisma.indexerError.findUnique({ where: { errorId } });
  } catch (cause) {
    throw new DatabaseError(`Failed to find dead-letter row ${errorId}`, cause);
  }
}

export async function markDeadLetterResolved(
  prisma: PrismaClient,
  errorId: string
): Promise<void> {
  try {
    await prisma.indexerError.update({
      where: { errorId },
      data: { resolvedAt: new Date() },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to mark dead-letter row ${errorId} resolved`, cause);
  }
}

export async function incrementDeadLetterRetry(
  prisma: PrismaClient,
  errorId: string,
  message: string
): Promise<void> {
  try {
    await prisma.indexerError.update({
      where: { errorId },
      data: {
        retryCount: { increment: 1 },
        message,
      },
    });
  } catch (cause) {
    throw new DatabaseError(`Failed to increment retry for dead-letter row ${errorId}`, cause);
  }
}

export function createIndexerErrorsRepository(prisma: PrismaClient): IndexerErrorsRepository {
  return {
    writeDeadLetter: (input) => writeDeadLetter(prisma, input),
    findByErrorId: (errorId) => findDeadLetterByErrorId(prisma, errorId),
    markResolved: (errorId) => markDeadLetterResolved(prisma, errorId),
    incrementRetry: (errorId, message) => incrementDeadLetterRetry(prisma, errorId, message),
  };
}
