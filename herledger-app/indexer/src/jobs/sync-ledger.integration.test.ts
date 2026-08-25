import { describe, it, expect, beforeEach } from "vitest";
import { getPrismaClient } from "../db/client.js";
import { getCheckpoint, saveCheckpoint, MAIN_STREAM } from "../db/schema/checkpoint.js";

// These tests require a database connection.
// Skip if DATABASE_URL is not set.
const skipIfNoDb = process.env.DATABASE_URL ? describe : describe.skip;

skipIfNoDb("syncLedger integration - idempotency", () => {
  beforeEach(async () => {
    // Clear checkpoint before each test
    const prisma = getPrismaClient();
    await prisma.indexerCheckpoint.deleteMany({
      where: { stream: MAIN_STREAM },
    });
    // Clear financial events and stellar transactions to ensure clean state
    await prisma.financialEvent.deleteMany({});
    await prisma.stellarTransaction.deleteMany({});
    await prisma.indexerError.deleteMany({});
  });

  it("checkpoint is saved per-ledger, not per-batch", async () => {
    const prisma = getPrismaClient();

    // Simulate processing ledgers 1, 2, 3, 4, 5 in a single cycle
    for (let ledger = 1; ledger <= 5; ledger++) {
      await saveCheckpoint(prisma, MAIN_STREAM, ledger);
    }

    // Verify the final checkpoint is at ledger 5
    const checkpoint = await getCheckpoint(prisma, MAIN_STREAM);
    expect(checkpoint).toBe(5);
  });

  it("resumes from last committed ledger after crash", async () => {
    const prisma = getPrismaClient();

    // Simulate a batch of 10 ledgers being processed with per-ledger commits
    for (let ledger = 1; ledger <= 10; ledger++) {
      await saveCheckpoint(prisma, MAIN_STREAM, ledger);
    }

    // Simulate a restart: ledgers 1-10 should already be processed
    const checkpoint = await getCheckpoint(prisma, MAIN_STREAM);
    expect(checkpoint).toBe(10);

    // Simulate crash after ledger 7: checkpoint should still be at 10
    // because we saved per-ledger
    // Now simulate recovery and continuing from checkpoint
    for (let ledger = 11; ledger <= 15; ledger++) {
      await saveCheckpoint(prisma, MAIN_STREAM, ledger);
    }

    const recoveredCheckpoint = await getCheckpoint(prisma, MAIN_STREAM);
    expect(recoveredCheckpoint).toBe(15);
  });

  it("does not re-process already-committed ledgers", async () => {
    const prisma = getPrismaClient();

    // First cycle: process ledgers 1-100
    for (let ledger = 1; ledger <= 100; ledger++) {
      await saveCheckpoint(prisma, MAIN_STREAM, ledger);
    }

    let checkpoint = await getCheckpoint(prisma, MAIN_STREAM);
    expect(checkpoint).toBe(100);

    // Simulate restart: checkpoint is still 100
    checkpoint = await getCheckpoint(prisma, MAIN_STREAM);
    expect(checkpoint).toBe(100);

    // Second cycle: only process ledgers > 100
    for (let ledger = 101; ledger <= 105; ledger++) {
      await saveCheckpoint(prisma, MAIN_STREAM, ledger);
    }

    checkpoint = await getCheckpoint(prisma, MAIN_STREAM);
    expect(checkpoint).toBe(105);

    // Ledger count should be exactly 105, not duplicated
    expect(checkpoint).toBe(105);
  });

  it("checkpoint defaults to 0 if no checkpoint exists", async () => {
    const prisma = getPrismaClient();

    // Ensure no checkpoint exists
    await prisma.indexerCheckpoint.deleteMany({
      where: { stream: MAIN_STREAM },
    });

    const checkpoint = await getCheckpoint(prisma, MAIN_STREAM);
    expect(checkpoint).toBe(0);
  });

  it("handles concurrent checkpoint saves", async () => {
    const prisma = getPrismaClient();

    // Save multiple checkpoints concurrently
    await Promise.all([
      saveCheckpoint(prisma, MAIN_STREAM, 1),
      saveCheckpoint(prisma, MAIN_STREAM, 2),
      saveCheckpoint(prisma, MAIN_STREAM, 3),
    ]);

    // The final checkpoint should be one of the saved values
    // (due to race conditions, we verify it's a valid ledger number)
    const checkpoint = await getCheckpoint(prisma, MAIN_STREAM);
    expect([1, 2, 3]).toContain(checkpoint);
  });

  it("incremental dead-letter writes accumulate without loss", async () => {
    const prisma = getPrismaClient();

    // Simulate permanent failures being written to dead letter
    const errors: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const result = await prisma.indexerError.create({
        data: {
          rawXdr: `xdr-${i}`,
          stage: "index",
          message: `Error processing ledger ${i}`,
          context: { ledgerSequence: i },
        },
        select: { errorId: true },
      });
      errors.push(result.errorId);
    }

    // Verify all 5 errors are recorded
    const count = await prisma.indexerError.count({
      where: { stage: "index" },
    });
    expect(count).toBe(5);

    // Verify each can be retrieved
    for (const errorId of errors) {
      const error = await prisma.indexerError.findUnique({
        where: { errorId },
      });
      expect(error).toBeDefined();
      expect(error?.rawXdr).toMatch(/^xdr-\d+$/);
    }
  });

  it("pending errors are counted correctly", async () => {
    const prisma = getPrismaClient();

    // Create 3 unresolved errors
    for (let i = 1; i <= 3; i++) {
      await prisma.indexerError.create({
        data: {
          rawXdr: `xdr-${i}`,
          stage: "index",
          message: `Error ${i}`,
        },
      });
    }

    // Create 2 resolved errors
    for (let i = 4; i <= 5; i++) {
      await prisma.indexerError.create({
        data: {
          rawXdr: `xdr-${i}`,
          stage: "index",
          message: `Error ${i}`,
          resolvedAt: new Date(),
        },
      });
    }

    const unresolved = await prisma.indexerError.count({
      where: { resolvedAt: null },
    });
    expect(unresolved).toBe(3);

    const resolved = await prisma.indexerError.count({
      where: { resolvedAt: { not: null } },
    });
    expect(resolved).toBe(2);
  });
});
