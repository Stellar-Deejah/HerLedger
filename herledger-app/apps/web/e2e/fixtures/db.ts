import { test as base } from "@playwright/test";

import { getPrismaClient } from "../../lib/db/client";

// Ensure DATABASE_URL is configured
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/herledger_dev";
}

const prisma = getPrismaClient();

export const test = base.extend<{
  db: typeof prisma;
  seedFinancialEvent: (override?: Record<string, unknown>) => Promise<unknown>;
}>({
  db: async ({}, use) => {
    // Teardown before each test ensures a clean slate
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "attestations", "financial_events", "business_profiles", "sessions", "users", "rate_limits" CASCADE;'
    );

    await use(prisma);
  },

  seedFinancialEvent: async ({ db }, use) => {
    await use(async (override = {}) => {
      return db.financialEvent.create({
        data: {
          id: "evt_123",
          eventId: "e".repeat(64),
          stellarReference: "tx_hash_123",
          metadataHash: "m".repeat(64),
          businessId: "biz_123",
          eventType: "PaymentReceived",
          assetAddress: "native",
          amount: "100000000",
          status: "Pending",
          ledgerSequence: 100,
          ...override,
        },
      });
    });
  },
});

export { expect } from "@playwright/test";
