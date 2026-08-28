import type { PrismaClient } from "@prisma/client";
import { describe, it, expect, vi } from "vitest";

import { batchUpsertFinancialEvents } from "../financial-events.js";
import { batchUpsertStellarTransactions } from "../stellar-transactions.js";

interface FakeCreateManyCall {
  data: Record<string, unknown>[];
  skipDuplicates?: boolean;
}

function makeFakePrisma(): {
  prisma: PrismaClient;
  createManyCalls: { financialEvent: FakeCreateManyCall[]; stellarTransaction: FakeCreateManyCall[] };
} {
  const calls: { financialEvent: FakeCreateManyCall[]; stellarTransaction: FakeCreateManyCall[] } = {
    financialEvent: [],
    stellarTransaction: [],
  };
  const prisma = {
    financialEvent: {
      createMany: vi.fn(async (args: FakeCreateManyCall) => {
        calls.financialEvent.push(args);
        return { count: args.data.length };
      }),
    },
    stellarTransaction: {
      createMany: vi.fn(async (args: FakeCreateManyCall) => {
        calls.stellarTransaction.push(args);
        return { count: args.data.length };
      }),
    },
  } as unknown as PrismaClient;
  return { prisma, createManyCalls: calls };
}

describe("batchUpsertStellarTransactions", () => {
  it("skips the call entirely for an empty input", async () => {
    const { prisma, createManyCalls } = makeFakePrisma();
    await batchUpsertStellarTransactions(prisma, []);
    expect(createManyCalls.stellarTransaction).toHaveLength(0);
  });

  it("writes all rows in a single createMany with skipDuplicates", async () => {
    const { prisma, createManyCalls } = makeFakePrisma();
    await batchUpsertStellarTransactions(prisma, [
      { hash: "a".repeat(64), ledgerSequence: 10, successful: true, sourceAddress: "GA" },
      { hash: "b".repeat(64), ledgerSequence: 10, successful: false, sourceAddress: "GB" },
    ]);

    expect(createManyCalls.stellarTransaction).toHaveLength(1);
    const call = createManyCalls.stellarTransaction[0]!;
    expect(call.skipDuplicates).toBe(true);
    expect(call.data).toHaveLength(2);
    expect(call.data[0]).toEqual({
      hash: "a".repeat(64),
      ledgerSequence: 10,
      successful: true,
      sourceAddress: "GA",
    });
  });

  it("handles duplicate hashes in a re-indexed batch without erroring", async () => {
    const { prisma, createManyCalls } = makeFakePrisma();
    const tx = { hash: "a".repeat(64), ledgerSequence: 10, successful: true, sourceAddress: "GA" };

    // First index inserts the batch.
    await batchUpsertStellarTransactions(prisma, [tx]);
    // Re-indexing the same ledger sends the same rows again; skipDuplicates
    // tells Postgres to ignore the already-present hashes.
    await batchUpsertStellarTransactions(prisma, [tx]);

    expect(createManyCalls.stellarTransaction).toHaveLength(2);
    for (const call of createManyCalls.stellarTransaction) {
      expect(call.skipDuplicates).toBe(true);
    }
  });
});

describe("batchUpsertFinancialEvents", () => {
  it("skips the call entirely for an empty input", async () => {
    const { prisma, createManyCalls } = makeFakePrisma();
    await batchUpsertFinancialEvents(prisma, []);
    expect(createManyCalls.financialEvent).toHaveLength(0);
  });

  it("writes all rows in a single createMany with skipDuplicates, storing amounts as strings", async () => {
    const { prisma, createManyCalls } = makeFakePrisma();
    await batchUpsertFinancialEvents(prisma, [
      {
        businessId: "biz-1",
        eventId: "e".repeat(64),
        eventType: "PaymentReceived",
        assetAddress: "CASSET",
        amount: 50000000n,
        stellarReference: "a".repeat(64),
        metadataHash: "0".repeat(64),
        status: "Pending",
        ledgerSequence: 10,
      },
    ]);

    expect(createManyCalls.financialEvent).toHaveLength(1);
    const call = createManyCalls.financialEvent[0]!;
    expect(call.skipDuplicates).toBe(true);
    expect(call.data[0]).toMatchObject({
      businessId: "biz-1",
      eventId: "e".repeat(64),
      eventType: "PaymentReceived",
      amount: "50000000",
      status: "Pending",
      ledgerSequence: 10,
    });
  });

  it("handles duplicate eventIds in a re-indexed batch without erroring", async () => {
    const { prisma, createManyCalls } = makeFakePrisma();
    const event = {
      businessId: "biz-1",
      eventId: "e".repeat(64),
      eventType: "PaymentReceived" as const,
      assetAddress: "CASSET",
      amount: 100n,
      stellarReference: "a".repeat(64),
      metadataHash: "0".repeat(64),
      status: "Pending" as const,
      ledgerSequence: 10,
    };

    await batchUpsertFinancialEvents(prisma, [event]);
    await batchUpsertFinancialEvents(prisma, [event]);

    expect(createManyCalls.financialEvent).toHaveLength(2);
    for (const call of createManyCalls.financialEvent) {
      expect(call.skipDuplicates).toBe(true);
    }
  });
});