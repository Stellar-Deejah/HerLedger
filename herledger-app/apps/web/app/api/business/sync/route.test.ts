import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";
import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";
import { getBusiness } from "@herledger/sdk";

import { POST } from "./route";

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
vi.mock("@herledger/sdk", () => ({
  getBusiness: vi.fn(),
}));

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/business/sync", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/business/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when the request body is invalid", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(createMockDbClient());

    const res = await POST(jsonRequest({ businessId: "" }));
    expect(res.status).toBe(400);
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

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(404);
  });

  it("syncs DB from on-chain data on success", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    const update = vi.fn().mockResolvedValue({});
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn().mockResolvedValue({ id: "1", userId: "u_1" }),
          findByUserId: vi.fn(),
          create: vi.fn(),
          update,
          deactivate: vi.fn(),
        },
      })
    );
    vi.mocked(getBusiness).mockResolvedValueOnce({
      wallet: "GNEW",
      metadataHash: "newhash",
      active: true,
    } as never);

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ walletAddress: "GNEW", metadataHash: "newhash", active: true })
    );
  });

  it("returns 500 when the on-chain lookup throws", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn().mockResolvedValue({ id: "1", userId: "u_1" }),
          findByUserId: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );
    vi.mocked(getBusiness).mockRejectedValueOnce(new Error("rpc down"));

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(500);
  });
});
