import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { createDbClient, getDbClient } from "../client.js";
import { createMockDbClient } from "../mock.js";

describe("Database Client & DI Factory", () => {
  it("creates a repository-backed DbClient from a PrismaClient", () => {
    const mockPrisma = {
      businessProfile: { findUnique: vi.fn() },
    } as unknown as PrismaClient;

    const db = createDbClient(mockPrisma);

    expect(db.prisma).toBe(mockPrisma);
    expect(db.businesses).toBeDefined();
    expect(db.financialEvents).toBeDefined();
    expect(db.attestations).toBeDefined();
    expect(db.attesters).toBeDefined();
    expect(db.checkpoint).toBeDefined();
    expect(db.indexerErrors).toBeDefined();
    expect(db.stellarTransactions).toBeDefined();
    expect(db.users).toBeDefined();
    expect(db.disputes).toBeDefined();
  });

  it("provides getDbClient singleton and allows overriding with setDbClient", async () => {
    process.env["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/testdb";
    const db1 = getDbClient();
    const db2 = getDbClient();
    expect(db1).toBe(db2);

    const mockDb = createMockDbClient();
    const { setDbClient, resetDbClient } = await import("../client.js");
    setDbClient(mockDb);
    expect(getDbClient()).toBe(mockDb);
    resetDbClient();
  });

  it("creates a mock DbClient with default mocks", async () => {
    const mockDb = createMockDbClient();

    expect(mockDb.businesses.findById).toBeDefined();
    const biz = await mockDb.businesses.findById("biz-1");
    expect(biz).toBeNull();

    const check = await mockDb.checkpoint.get("main");
    expect(check).toBe(0);
  });

  it("accepts repository overrides in createMockDbClient", async () => {
    const mockDb = createMockDbClient({
      businesses: {
        findAllActiveWallets: vi.fn().mockResolvedValue({
          wallets: [{ id: "1", businessId: "b1", walletAddress: "G1" }],
          nextCursor: null,
        }),
        findByWallet: vi.fn().mockResolvedValue(null),
        findById: vi.fn().mockResolvedValue({ id: "1", businessId: "b1" } as never),
        findByUserId: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({} as never),
        update: vi.fn().mockResolvedValue({} as never),
        deactivate: vi.fn().mockResolvedValue({} as never),
      },
    });

    const page = await mockDb.businesses.findAllActiveWallets();
    expect(page.wallets).toHaveLength(1);
    expect(page.wallets[0]?.businessId).toBe("b1");

    const found = await mockDb.businesses.findById("b1");
    expect(found?.businessId).toBe("b1");
  });
});
