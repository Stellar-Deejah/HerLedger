-- Per-wallet checkpoints: widen the checkpoint key from (stream) to
-- (stream, walletAddress) so each business wallet can track its own
-- last-processed ledger instead of sharing a single stream-global one.
-- The stream-global checkpoint is stored under the sentinel walletAddress
-- "global" (NULL is avoided because Postgres treats NULLs as distinct in
-- unique indexes).

-- 1. Add the column (nullable first so the existing row can be backfilled).
ALTER TABLE "indexer_checkpoints" ADD COLUMN "walletAddress" TEXT;

-- 2. Backfill the existing stream-global rows with the sentinel.
UPDATE "indexer_checkpoints" SET "walletAddress" = 'global' WHERE "walletAddress" IS NULL;

-- 3. The sentinel is always set from here on, so tighten to NOT NULL.
ALTER TABLE "indexer_checkpoints" ALTER COLUMN "walletAddress" SET NOT NULL;

-- 4. Replace the old unique index on `stream` with a composite one.
DROP INDEX "indexer_checkpoints_stream_key";

CREATE UNIQUE INDEX "indexer_checkpoints_stream_walletAddress_key"
  ON "indexer_checkpoints"("stream", "walletAddress");

-- 5. Claim-based work distribution for multi-replica sync. One row per
-- business wallet; replicas atomically claim wallets via lockedBy/lockedUntil.
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "lockedBy" TEXT,
    "lockedUntil" TIMESTAMPTZ,
    "lastHeartbeatAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sync_jobs_walletAddress_key" ON "sync_jobs"("walletAddress");

CREATE INDEX "sync_jobs_lockedUntil_idx" ON "sync_jobs"("lockedUntil");
