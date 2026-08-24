import { test as base } from "@playwright/test";
import { getPrismaClient } from "../../lib/db/client";

// Ensure DATABASE_URL is configured
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/herledger_dev";
}

const prisma = getPrismaClient();

export const test = base.extend<{
  db: typeof prisma;
  seedFinancialEvent: (override?: any) => Promise<any>;
}>({
  db: async ({}, use) => {
    // Teardown before each test ensures a clean slate
    await prisma.$transaction([
      prisma.$executeRawUnsafe('TRUNCATE TABLE "Session" CASCADE;'),
      prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE;'),
      prisma.$executeRawUnsafe('TRUNCATE TABLE "BusinessProfile" CASCADE;'),
      prisma.$executeRawUnsafe('TRUNCATE TABLE "FinancialEvent" CASCADE;'),
      prisma.$executeRawUnsafe('TRUNCATE TABLE "Attestation" CASCADE;'),
    ]);
    
    await use(prisma);
  },
  
  seedFinancialEvent: async ({ db }, use) => {
    await use(async (override = {}) => {
      return db.financialEvent.create({
        data: {
          id: "evt_123",
          eventId: "e".repeat(64),
          stellarReference: "tx_hash_123",
          businessId: "biz_123",
          type: "PaymentReceived",
          assetAddress: "native",
          amount: "100000000",
          senderAddress: "GBOTHERACCOUNTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          recipientAddress: "GBSOMEBUSINESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          status: "Pending",
          ledgerSequence: 100,
          ...override,
        }
      });
    });
  }
});

export { expect } from "@playwright/test";
