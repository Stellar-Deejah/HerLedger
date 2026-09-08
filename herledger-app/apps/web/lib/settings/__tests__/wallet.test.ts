import { describe, it, expect, vi } from "vitest";
import {
  ActiveDisputeError,
  hasActiveDisputes,
  relinkBusinessWallet,
  unlinkBusinessWallet,
} from "../wallet";

function makeFakePrisma(options: { disputedEventCount: number }) {
  return {
    financialEvent: {
      count: vi.fn(async () => options.disputedEventCount),
    },
    businessProfile: {
      update: vi.fn(async ({ where, data }: { where: unknown; data: unknown }) => ({
        where,
        data,
      })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("hasActiveDisputes", () => {
  it("is false when there are no disputed events", async () => {
    const prisma = makeFakePrisma({ disputedEventCount: 0 });
    expect(await hasActiveDisputes(prisma, "biz_1")).toBe(false);
  });

  it("is true when there is at least one disputed event", async () => {
    const prisma = makeFakePrisma({ disputedEventCount: 1 });
    expect(await hasActiveDisputes(prisma, "biz_1")).toBe(true);
  });

  it("queries only Disputed-status events for the given business", async () => {
    const prisma = makeFakePrisma({ disputedEventCount: 0 });
    await hasActiveDisputes(prisma, "biz_1");
    expect(prisma.financialEvent.count).toHaveBeenCalledWith({
      where: { businessId: "biz_1", status: "Disputed" },
    });
  });
});

describe("unlinkBusinessWallet", () => {
  it("clears the wallet address when there are no active disputes", async () => {
    const prisma = makeFakePrisma({ disputedEventCount: 0 });
    await unlinkBusinessWallet(prisma, "biz_1");

    expect(prisma.businessProfile.update).toHaveBeenCalledWith({
      where: { businessId: "biz_1" },
      data: { walletAddress: null },
    });
  });

  it("throws ActiveDisputeError and does not touch the wallet when a dispute is active", async () => {
    const prisma = makeFakePrisma({ disputedEventCount: 1 });

    await expect(unlinkBusinessWallet(prisma, "biz_1")).rejects.toBeInstanceOf(ActiveDisputeError);
    expect(prisma.businessProfile.update).not.toHaveBeenCalled();
  });
});

describe("relinkBusinessWallet", () => {
  it("sets the new wallet address when there are no active disputes", async () => {
    const prisma = makeFakePrisma({ disputedEventCount: 0 });
    await relinkBusinessWallet(prisma, "biz_1", "GNEWWALLETADDRESS");

    expect(prisma.businessProfile.update).toHaveBeenCalledWith({
      where: { businessId: "biz_1" },
      data: { walletAddress: "GNEWWALLETADDRESS" },
    });
  });

  it("throws ActiveDisputeError and does not touch the wallet when a dispute is active", async () => {
    const prisma = makeFakePrisma({ disputedEventCount: 1 });

    await expect(relinkBusinessWallet(prisma, "biz_1", "GNEWWALLETADDRESS")).rejects.toBeInstanceOf(
      ActiveDisputeError
    );
    expect(prisma.businessProfile.update).not.toHaveBeenCalled();
  });
});
