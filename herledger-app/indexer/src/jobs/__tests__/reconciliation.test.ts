import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";

const { mockQueryRaw, mockGetFinancialEvent } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockGetFinancialEvent: vi.fn(),
}));

vi.mock("../../db/client.js", () => ({
  getPrismaClient: () => ({ $queryRaw: mockQueryRaw }),
}));

vi.mock("@herledger/config/server", () => ({
  getStellarNetworkConfig: () => ({
    network: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  }),
  getContractConfig: () => ({
    businessRegistryId: "CBUSINESS",
    financialLedgerId: "CLEDGER",
    attestationRegistryId: "CATTEST",
  }),
}));

vi.mock("@herledger/config/server", () => ({
  getStellarNetworkConfig: () => ({
    network: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  }),
  getContractConfig: () => ({
    businessRegistryId: "CBUSINESS",
    financialLedgerId: "CLEDGER",
    attestationRegistryId: "CATTEST",
  }),
}));

vi.mock("@herledger/sdk", () => ({
  registerCurrentNetworkAddresses: (_network: string, addrs: unknown) => addrs,
  buildContractConfig: (_registry: unknown, _network: string, addrs: unknown) => addrs,
  getFinancialEvent: mockGetFinancialEvent,
}));

import { runReconciliationCycle } from "../reconciliation.js";

describe("runReconciliationCycle", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
    mockGetFinancialEvent.mockReset();
  });

  it("reports no discrepancies when indexed rows match on-chain state", async () => {
    mockQueryRaw.mockResolvedValue([
      { id: "1", eventId: "evt-1", eventType: "PaymentReceived", status: "Pending", amount: "100" },
    ]);
    mockGetFinancialEvent.mockResolvedValue({
      eventType: "PaymentReceived",
      status: "Pending",
      amount: 100n,
    });

    const result = await runReconciliationCycle(1);

    expect(result.sampled).toBe(1);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("flags a status mismatch between indexed and on-chain state", async () => {
    mockQueryRaw.mockResolvedValue([
      { id: "1", eventId: "evt-1", eventType: "PaymentReceived", status: "Pending", amount: "100" },
    ]);
    mockGetFinancialEvent.mockResolvedValue({
      eventType: "PaymentReceived",
      status: "Verified",
      amount: 100n,
    });

    const result = await runReconciliationCycle(1);

    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0]).toMatchObject({
      eventId: "evt-1",
      field: "status",
      indexed: "Pending",
      onChain: "Verified",
    });
  });

  it("flags an amount mismatch", async () => {
    mockQueryRaw.mockResolvedValue([
      { id: "1", eventId: "evt-1", eventType: "PaymentReceived", status: "Pending", amount: "100" },
    ]);
    mockGetFinancialEvent.mockResolvedValue({
      eventType: "PaymentReceived",
      status: "Pending",
      amount: 999n,
    });

    const result = await runReconciliationCycle(1);

    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0]?.field).toBe("amount");
  });

  it("flags an event that is indexed but missing on-chain", async () => {
    mockQueryRaw.mockResolvedValue([
      { id: "1", eventId: "evt-1", eventType: "PaymentReceived", status: "Pending", amount: "100" },
    ]);
    mockGetFinancialEvent.mockResolvedValue(null);

    const result = await runReconciliationCycle(1);

    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0]).toMatchObject({ field: "existence", onChain: "missing" });
  });

  it("skips (does not crash) an event whose on-chain fetch throws", async () => {
    mockQueryRaw.mockResolvedValue([
      { id: "1", eventId: "evt-1", eventType: "PaymentReceived", status: "Pending", amount: "100" },
    ]);
    mockGetFinancialEvent.mockRejectedValue(new Error("RPC timeout"));

    const result = await runReconciliationCycle(1);

    expect(result.sampled).toBe(1);
    expect(result.discrepancies).toHaveLength(0);
  });
});
