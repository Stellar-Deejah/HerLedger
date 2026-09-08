-- AlterTable: Add VarChar(40) constraint to FinancialEvent.amount
ALTER TABLE "financial_events" ALTER COLUMN "amount" TYPE VARCHAR(40);

-- CreateIndex: Composite index on FinancialEvent (businessId, status)
-- Replaces the standalone (businessId) index — the composite covers queries
-- on businessId alone as well as the common (businessId, status) pattern.
CREATE INDEX "financial_events_businessId_status_idx" ON "financial_events"("businessId", "status");

-- DropIndex: Remove standalone (businessId) index — now covered by composite
DROP INDEX IF EXISTS "financial_events_businessId_idx";

-- DropIndex: Remove standalone (status) index — now covered by composite
DROP INDEX IF EXISTS "financial_events_status_idx";

-- CreateIndex: Composite index on Attestation (eventId, status)
-- Replaces the standalone (eventId) index — the composite covers queries
-- on eventId alone as well as the common (eventId, status) pattern.
CREATE INDEX "attestations_eventId_status_idx" ON "attestations"("eventId", "status");

-- DropIndex: Remove standalone (eventId) index — now covered by composite
DROP INDEX IF EXISTS "attestations_eventId_idx";

-- CreateTable: AuditLog — append-only record of state-changing operations
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorAddress" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldValue" JSONB,
    "newValue" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorAddress_idx" ON "audit_logs"("actorAddress");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
