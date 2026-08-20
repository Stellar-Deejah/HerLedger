import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";

const { mockFindDeadLetter, mockMarkResolved, mockIncrementRetry, mockProcessTransaction } =
  vi.hoisted(() => ({
    mockFindDeadLetter: vi.fn(),
    mockMarkResolved: vi.fn(),
    mockIncrementRetry: vi.fn(),
    mockProcessTransaction: vi.fn(),
  }));

vi.mock("../../../db/client.js", () => ({
  getPrismaClient: () => ({}),
}));

vi.mock("../../../db/schema/indexer-errors.js", () => ({
  findDeadLetterByErrorId: mockFindDeadLetter,
  markDeadLetterResolved: mockMarkResolved,
  incrementDeadLetterRetry: mockIncrementRetry,
}));

vi.mock("../../../jobs/process-transaction.js", () => ({
  processTransactionForWallet: mockProcessTransaction,
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
}));

vi.mock("@stellar/stellar-sdk", () => ({
  TransactionBuilder: {
    fromXDR: () => ({
      hash: () => Buffer.from("abcd", "hex"),
      source: "GSOURCE",
    }),
  },
}));

import { adminRoutes } from "../admin.js";

async function buildTestApp() {
  const app = Fastify();
  await app.register(adminRoutes);
  return app;
}

describe("POST /replay/:errorId", () => {
  beforeEach(() => {
    process.env["ADMIN_API_TOKEN"] = "test-token";
    mockFindDeadLetter.mockReset();
    mockMarkResolved.mockReset();
    mockIncrementRetry.mockReset();
    mockProcessTransaction.mockReset();
  });

  it("rejects requests without a valid admin token", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "POST", url: "/replay/err-1" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 404 when the errorId does not exist", async () => {
    mockFindDeadLetter.mockResolvedValue(null);
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/replay/err-1",
      headers: { "x-admin-token": "test-token" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 409 when the event was already resolved", async () => {
    mockFindDeadLetter.mockResolvedValue({
      errorId: "err-1",
      rawXdr: "AAAA",
      retryCount: 0,
      resolvedAt: new Date(),
      context: { walletAddress: "GWALLET" },
    });
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/replay/err-1",
      headers: { "x-admin-token": "test-token" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("replays successfully and marks the row resolved", async () => {
    mockFindDeadLetter.mockResolvedValue({
      errorId: "err-1",
      rawXdr: "AAAA",
      retryCount: 1,
      resolvedAt: null,
      context: { walletAddress: "GWALLET", ledgerSequence: 42 },
    });
    mockProcessTransaction.mockResolvedValue("indexed");
    mockMarkResolved.mockResolvedValue(undefined);

    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/replay/err-1",
      headers: { "x-admin-token": "test-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(mockMarkResolved).toHaveBeenCalledWith(expect.anything(), "err-1");
    const body = JSON.parse(res.body);
    expect(body.data.outcome).toBe("indexed");
  });

  it("increments the retry counter when replay fails", async () => {
    mockFindDeadLetter.mockResolvedValue({
      errorId: "err-1",
      rawXdr: "AAAA",
      retryCount: 1,
      resolvedAt: null,
      context: { walletAddress: "GWALLET", ledgerSequence: 42 },
    });
    mockProcessTransaction.mockRejectedValue(new Error("still broken"));

    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/replay/err-1",
      headers: { "x-admin-token": "test-token" },
    });

    expect(res.statusCode).toBe(500);
    expect(mockIncrementRetry).toHaveBeenCalledWith(expect.anything(), "err-1", "still broken");
  });

  it("returns 409 once retryCount has hit the max", async () => {
    mockFindDeadLetter.mockResolvedValue({
      errorId: "err-1",
      rawXdr: "AAAA",
      retryCount: 5,
      resolvedAt: null,
      context: { walletAddress: "GWALLET" },
    });
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/replay/err-1",
      headers: { "x-admin-token": "test-token" },
    });
    expect(res.statusCode).toBe(409);
  });
});
