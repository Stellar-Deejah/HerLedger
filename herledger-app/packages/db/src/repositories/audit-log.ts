import type { PrismaClient } from "@prisma/client";

import { DatabaseError } from "../types.js";

// ---------------------------------------------------------------------------
// Audit log repository — append-only record of state-changing operations
// ---------------------------------------------------------------------------

export interface CreateAuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  actorAddress: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

/**
 * Append an audit log entry. This is an append-only operation — no UPDATE or
 * DELETE should ever target the audit_logs table from application code.
 *
 * The entity ID is stored as a plain string (not a foreign key) because the
 * table is polymorphic: it can reference BusinessProfile.businessId,
 * FinancialEvent.eventId, or any future entity type.
 */
export async function createAuditLog(
  prisma: PrismaClient,
  input: CreateAuditLogInput
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "audit_logs" ("id", "entityType", "entityId", "action", "actorAddress", "oldValue", "newValue")
      VALUES (gen_random_uuid()::text, ${input.entityType}, ${input.entityId}, ${input.action}, ${input.actorAddress}, ${input.oldValue ?? null}::jsonb, ${input.newValue ?? null}::jsonb)
    `;
  } catch (cause) {
    throw new DatabaseError(
      `Failed to create audit log for ${input.entityType}:${input.entityId}`,
      cause
    );
  }
}

export async function findAuditLogsByEntity(
  prisma: PrismaClient,
  entityType: string,
  entityId: string
): Promise<Array<{
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorAddress: string;
  timestamp: Date;
  oldValue: unknown;
  newValue: unknown;
}>> {
  try {
    return await prisma.$queryRaw`
      SELECT "id", "entityType", "entityId", "action", "actorAddress", "timestamp", "oldValue", "newValue"
      FROM "audit_logs"
      WHERE "entityType" = ${entityType} AND "entityId" = ${entityId}
      ORDER BY "timestamp" ASC
    `;
  } catch (cause) {
    throw new DatabaseError(
      `Failed to query audit logs for ${entityType}:${entityId}`,
      cause
    );
  }
}
