import { describe, it, expect, vi, beforeEach } from "vitest";
import { indexPayment } from "../financial-events.js";
import { resetMetrics, getMetrics } from "../../observability/index.js";
import type { ParsedPayment } from "../../types/index.js";

vi.mock("@herledger/sdk", () => ({
  isSupportedAsset: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../db/schema/financial-events.js", () => ({
  upsertFinancialEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../db/schema/stellar-transactions.js", () => ({
  upsertStellarTransaction: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../db/schema/businesses.js", () => ({
  findBusinessByWallet: vi.fn((_prisma, address: string) => {
    if (address === "GBUSINESS_RECV") {
      return Promise.resolve({ businessId: "biz-recv-123", walletAddress: address });
    }
    if (address === "GBUSINESS_SENT") {
      return Promise.resolve({ businessId: "biz-sent-456", walletAddress: address });
    }
    return Promise.resolve(null);
  }),
}));

describe("Financial Events Indexing & Metrics", () => {
  const mockPrisma = {} as unknown as import("@prisma/client").PrismaClient;
  const mockConfig = { network: "testnet" } as unknown as import("@herledger/sdk").StellarNetworkConfig;
  const mockContracts = {} as unknown as import("@herledger/sdk").ContractConfig;

  beforeEach(() => {
    resetMetrics();
    vi.clearAllMocks();
  });

  it("increments events_indexed_total with PaymentReceived when business is recipient", async () => {
    const payment: ParsedPayment = {
      transactionHash: "a".repeat(64),
      ledgerSequence: 12345,
      successful: true,
      sourceAddress: "GCUSTOMER_SENDER",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET_SUPPORTED",
      amount: 50000000n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const metrics = await getMetrics();
    expect(metrics).toContain('events_indexed_total{event_type="PaymentReceived",status="Pending"} 1');
  });

  it("increments events_indexed_total with PaymentSent when business is sender", async () => {
    const payment: ParsedPayment = {
      transactionHash: "b".repeat(64),
      ledgerSequence: 12346,
      successful: true,
      sourceAddress: "GBUSINESS_SENT",
      destinationAddress: "GOTHER_RECIPIENT",
      assetAddress: "CASSET_SUPPORTED",
      amount: 25000000n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const metrics = await getMetrics();
    expect(metrics).toContain('events_indexed_total{event_type="PaymentSent",status="Pending"} 1');
  });

  it("does not increment metrics if transaction was unsuccessful", async () => {
    const payment: ParsedPayment = {
      transactionHash: "c".repeat(64),
      ledgerSequence: 12347,
      successful: false,
      sourceAddress: "GCUSTOMER",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET",
      amount: 1000n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const metrics = await getMetrics();
    expect(metrics).not.toContain("events_indexed_total{");
  });
});
