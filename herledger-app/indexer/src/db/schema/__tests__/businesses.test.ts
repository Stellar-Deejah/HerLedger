import type { PrismaClient } from "@prisma/client";
import { describe, it, expect, vi } from "vitest";

import { findAllActiveBusinessWallets } from "../businesses.js";

// A fake in-memory set of active business profiles, used to simulate
// Prisma's cursor-based findMany behavior across pages.
function makeFakeWallets(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${String(i + 1).padStart(4, "0")}`,
    businessId: `biz-${i + 1}`,
    walletAddress: `GADDRESS${i + 1}`,
  }));
}

interface FakeFindManyArgs {
  cursor?: { id: string };
  skip?: number;
  take: number;
}

function makeFakePrisma(allWallets: ReturnType<typeof makeFakeWallets>): PrismaClient {
  return {
    businessProfile: {
      findMany: vi.fn(async (args: FakeFindManyArgs) => {
        const sorted = [...allWallets].sort((a, b) => (a.id > b.id ? 1 : -1));
        let startIndex = 0;
        if (args.cursor?.id) {
          const cursorIndex = sorted.findIndex((w) => w.id === args.cursor?.id);
          startIndex = cursorIndex + (args.skip ?? 0);
        }
        return sorted.slice(startIndex, startIndex + args.take);
      }),
    },
  } as unknown as PrismaClient;
}

describe("findAllActiveBusinessWallets cursor pagination", () => {
  it("returns all wallets in one page when fewer than pageSize", async () => {
    const prisma = makeFakePrisma(makeFakeWallets(5));
    const page = await findAllActiveBusinessWallets(prisma, { pageSize: 10 });

    expect(page.wallets).toHaveLength(5);
    expect(page.nextCursor).toBeNull();
  });

  it("paginates across multiple pages and covers every wallet exactly once", async () => {
    const total = 25;
    const pageSize = 10;
    const prisma = makeFakePrisma(makeFakeWallets(total));

    const seen: string[] = [];
    let cursor: string | undefined;

    while (true) {
      const page = await findAllActiveBusinessWallets(prisma, {
        ...(cursor !== undefined && { cursor }),
        pageSize,
      });
      seen.push(...page.wallets.map((w) => w.id));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }

    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total); // no duplicates
  });

  it("returns an empty page with a null cursor when there are no active wallets", async () => {
    const prisma = makeFakePrisma([]);
    const page = await findAllActiveBusinessWallets(prisma, { pageSize: 10 });

    expect(page.wallets).toHaveLength(0);
    expect(page.nextCursor).toBeNull();
  });

  it("uses the default page size when none is provided", async () => {
    const prisma = makeFakePrisma(makeFakeWallets(50));
    const page = await findAllActiveBusinessWallets(prisma);

    expect(page.wallets).toHaveLength(50);
    expect(page.nextCursor).toBeNull();
  });
});
