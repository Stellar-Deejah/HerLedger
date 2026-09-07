import { describe, it, expect, vi } from "vitest";

import { getCheckpoint, saveCheckpoint, MAIN_STREAM, GLOBAL_WALLET } from "../checkpoint.js";

function makeFakePrisma() {
  const rows = new Map<string, { stream: string; walletAddress: string; lastLedger: number }>();

  const prisma = {
    indexerCheckpoint: {
      findUnique: vi.fn(async ({ where }: { where: { stream_walletAddress: { stream: string; walletAddress: string } } }) => {
        const key = `${where.stream_walletAddress.stream}:${where.stream_walletAddress.walletAddress}`;
        return rows.get(key) ?? null;
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { stream_walletAddress: { stream: string; walletAddress: string } };
          create: { stream: string; walletAddress: string; lastLedger: number };
          update: { lastLedger: number };
        }) => {
          const key = `${where.stream_walletAddress.stream}:${where.stream_walletAddress.walletAddress}`;
          rows.set(key, {
            stream: create.stream,
            walletAddress: create.walletAddress,
            lastLedger: create.lastLedger ?? update.lastLedger,
          });
        }
      ),
    },
  };

  return prisma;
}

describe("checkpoint repository", () => {
  it("defaults the stream-global checkpoint to 0 and the GLOBAL_WALLET sentinel", async () => {
    const prisma = makeFakePrisma();
    expect(await getCheckpoint(prisma as never, MAIN_STREAM)).toBe(0);
  });

  it("persists and reads a per-wallet checkpoint independently of the global one", async () => {
    const prisma = makeFakePrisma();

    await saveCheckpoint(prisma as never, MAIN_STREAM, 42);
    await saveCheckpoint(prisma as never, MAIN_STREAM, 99, "GWALLET1");
    await saveCheckpoint(prisma as never, MAIN_STREAM, 77, "GWALLET2");

    expect(await getCheckpoint(prisma as never, MAIN_STREAM)).toBe(42);
    expect(await getCheckpoint(prisma as never, MAIN_STREAM, "GWALLET1")).toBe(99);
    expect(await getCheckpoint(prisma as never, MAIN_STREAM, "GWALLET2")).toBe(77);
  });

  it("uses GLOBAL_WALLET as the walletAddress key for stream-global checkpoints", async () => {
    const prisma = makeFakePrisma();
    await saveCheckpoint(prisma as never, MAIN_STREAM, 55);
    expect(GLOBAL_WALLET).toBe("global");
  });
});
