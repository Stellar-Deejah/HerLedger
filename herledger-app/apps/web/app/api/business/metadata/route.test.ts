import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";
import { updateBusinessMetadata } from "@herledger/sdk";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";

import { PUT } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));
vi.mock("@/lib/stellar/config", () => ({
  getStellarNetworkConfig: vi.fn(() => ({ network: "testnet" })),
  getContractConfig: vi.fn(() => ({})),
}));
vi.mock("@/lib/stellar/account", () => ({
  getAccount: vi.fn().mockResolvedValue({ accountId: () => "GWALLET" }),
}));
vi.mock("@herledger/sdk", () => ({
  updateBusinessMetadata: vi.fn(),
}));

// Each test uses a unique metadataHash so the module-level idempotency-key
// Map (keyed by `${businessId}:${metadataHash}`) never collides across tests.
function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/business/metadata", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

function activeBusinessDb() {
  return createMockDbClient({
    businesses: {
      findAllActiveWallets: vi.fn(),
      findByWallet: vi.fn(),
      findById: vi.fn().mockResolvedValue({ id: "1", userId: "u_1", walletAddress: "GWALLET" }),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      deactivate: vi.fn(),
    },
  });
}

describe("PUT /api/business/metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateBusinessMetadata).mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());

    const res = await PUT(jsonRequest({ businessId: "biz_1", metadataHash: "a".repeat(64) }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when metadataHash is not a 64-char hex string", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(createMockDbClient());

    const res = await PUT(jsonRequest({ businessId: "biz_1", metadataHash: "not-hex" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when the business is not owned by the caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn().mockResolvedValue(null),
          findByUserId: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );

    const res = await PUT(jsonRequest({ businessId: "biz_1", metadataHash: "b".repeat(64) }));
    expect(res.status).toBe(404);
  });

  it("updates metadata and returns 200 on success", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    const mockDb = activeBusinessDb();
    setDbClient(mockDb);

    const res = await PUT(jsonRequest({ businessId: "biz_1", metadataHash: "c".repeat(64) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
    expect(mockDb.businesses.update).toHaveBeenCalledWith("1", { metadataHash: "c".repeat(64) });
  });

  it("returns 500 when the on-chain call throws", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(activeBusinessDb());
    vi.mocked(updateBusinessMetadata).mockRejectedValueOnce(new Error("chain error"));

    const res = await PUT(jsonRequest({ businessId: "biz_1", metadataHash: "d".repeat(64) }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns a cached 200 for a repeated idempotent request", async () => {
    vi.mocked(auth.api.getSession)
      .mockResolvedValueOnce({ user: { id: "u_1" } } as never)
      .mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(activeBusinessDb());
    const hash = "e".repeat(64);

    const first = await PUT(jsonRequest({ businessId: "biz_1", metadataHash: hash }));
    expect(first.status).toBe(200);

    const second = await PUT(jsonRequest({ businessId: "biz_1", metadataHash: hash }));
    expect(second.status).toBe(200);
    // Only the first call should have reached the on-chain update.
    expect(vi.mocked(updateBusinessMetadata)).toHaveBeenCalledTimes(1);
  });
});
