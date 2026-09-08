import { describe, it, expect, vi } from "vitest";

import { tryClaimWallet, releaseWallet } from "../sync-jobs.js";

interface LockState {
  lockedBy: string | null;
  lockedUntil: Date | null;
}

/**
 * Fake Prisma client that models the atomic `updateMany` claim/release: the
 * WHERE clause is evaluated against the current lock state, and the operation
 * only affects the row when it matches — mirroring Postgres row-lock semantics
 * for a single UPDATE statement.
 */
function makeFakePrisma(state: LockState) {
  const updateMany = vi.fn(
    async ({
      where,
      data,
    }: {
      where: { lockedBy?: string; OR?: unknown[] };
      data: { lockedBy: string | null; lockedUntil: Date | null };
    }) => {
      // Release path: `where` carries a lockedBy guard, `data.lockedBy` is null.
      if (where.lockedBy !== undefined) {
        if (state.lockedBy !== where.lockedBy) return { count: 0 };
        state.lockedBy = data.lockedBy;
        state.lockedUntil = data.lockedUntil;
        return { count: 1 };
      }

      // Claim path: unlocked or expired lease only.
      const now = new Date();
      const isFree = state.lockedUntil === null || state.lockedUntil < now;
      if (isFree) {
        state.lockedBy = data.lockedBy;
        state.lockedUntil = data.lockedUntil;
        return { count: 1 };
      }
      return { count: 0 };
    }
  );

  const prisma = {
    syncJob: {
      upsert: vi.fn(async () => {}),
      updateMany,
    },
    $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(prisma)),
  };

  return { prisma, updateMany };
}

describe("tryClaimWallet", () => {
  it("claims an unlocked wallet and records the instance + lease", async () => {
    const state: LockState = { lockedBy: null, lockedUntil: null };
    const { prisma } = makeFakePrisma(state);

    const claimed = await tryClaimWallet(prisma as never, "GWALLET", "replica-a", 60_000);

    expect(claimed).toBe(true);
    expect(state.lockedBy).toBe("replica-a");
    expect(state.lockedUntil).not.toBeNull();
  });

  it("refuses to claim a wallet still locked by another replica", async () => {
    const future = new Date(Date.now() + 60_000);
    const state: LockState = { lockedBy: "replica-a", lockedUntil: future };
    const { prisma } = makeFakePrisma(state);

    const claimed = await tryClaimWallet(prisma as never, "GWALLET", "replica-b", 60_000);

    expect(claimed).toBe(false);
    expect(state.lockedBy).toBe("replica-a"); // unchanged
  });

  it("claims a wallet whose lease has expired", async () => {
    const past = new Date(Date.now() - 60_000);
    const state: LockState = { lockedBy: "replica-a", lockedUntil: past };
    const { prisma } = makeFakePrisma(state);

    const claimed = await tryClaimWallet(prisma as never, "GWALLET", "replica-b", 60_000);

    expect(claimed).toBe(true);
    expect(state.lockedBy).toBe("replica-b");
  });
});

describe("releaseWallet", () => {
  it("clears the lock only when the releasing instance holds it", async () => {
    const future = new Date(Date.now() + 60_000);
    const state: LockState = { lockedBy: "replica-a", lockedUntil: future };
    const { prisma } = makeFakePrisma(state);

    // A different replica must not be able to release replica-a's lock.
    await releaseWallet(prisma as never, "GWALLET", "replica-b");
    expect(state.lockedBy).toBe("replica-a");

    // The holding replica clears it.
    await releaseWallet(prisma as never, "GWALLET", "replica-a");
    expect(state.lockedBy).toBeNull();
    expect(state.lockedUntil).toBeNull();
  });
});
