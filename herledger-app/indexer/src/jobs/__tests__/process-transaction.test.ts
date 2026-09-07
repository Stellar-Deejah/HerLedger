import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockFetchOperations, mockIndexPayment } = vi.hoisted(() => ({
  mockFetchOperations: vi.fn(),
  mockIndexPayment: vi.fn(),
}));

vi.mock("../../stellar/rpc.js", () => ({
  fetchOperationsForTransaction: mockFetchOperations,
}));

vi.mock("../../index/financial-events.js", () => ({
  indexPayment: mockIndexPayment,
}));

import { processTransactionForWallet } from "../process-transaction.js";
import {
  MULTI_OP_TRANSACTION,
  MULTI_OP_OPERATIONS,
  BUSINESS_WALLET,
  COUNTERPARTY,
} from "../../stellar/__fixtures__/multi-operation-transaction.js";

const STELLAR_CONFIG = {
  network: "testnet" as const,
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
};

const CONTRACT_CONFIG = {
  businessRegistryId: "CBUSINESS",
  financialLedgerId: "CLEDGER",
  attestationRegistryId: "CATTEST",
} as never;

const PRISMA = {} as never;

describe("processTransactionForWallet", () => {
  beforeEach(() => {
    mockFetchOperations.mockReset();
    mockIndexPayment.mockReset();
    mockIndexPayment.mockResolvedValue(undefined);
  });

  it("indexes every qualifying payment operation, not just the first", async () => {
    mockFetchOperations.mockResolvedValue(MULTI_OP_OPERATIONS);

    const outcome = await processTransactionForWallet(
      MULTI_OP_TRANSACTION,
      BUSINESS_WALLET,
      PRISMA,
      STELLAR_CONFIG,
      CONTRACT_CONFIG
    );

    expect(outcome).toBe("indexed");
    expect(mockIndexPayment).toHaveBeenCalledTimes(2);
  });

  it("scopes indexed payments to the wallet the sync cycle is processing", async () => {
    mockFetchOperations.mockResolvedValue(MULTI_OP_OPERATIONS);

    // COUNTERPARTY is the source of every payment op in the fixture, so
    // filtering to it should still index both (it's the sender).
    const outcome = await processTransactionForWallet(
      MULTI_OP_TRANSACTION,
      COUNTERPARTY,
      PRISMA,
      STELLAR_CONFIG,
      CONTRACT_CONFIG
    );

    expect(outcome).toBe("indexed");
    expect(mockIndexPayment).toHaveBeenCalledTimes(2);
  });

  it("returns skipped and indexes nothing when no operation involves the wallet", async () => {
    mockFetchOperations.mockResolvedValue(MULTI_OP_OPERATIONS);

    const outcome = await processTransactionForWallet(
      MULTI_OP_TRANSACTION,
      "GUNRELATEDWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      PRISMA,
      STELLAR_CONFIG,
      CONTRACT_CONFIG
    );

    expect(outcome).toBe("skipped");
    expect(mockIndexPayment).not.toHaveBeenCalled();
  });
});
