import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";
import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";
import { deactivateBusiness } from "@herledger/sdk";

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
vi.mock("@/lib/stellar/account", () => ({
  getAccount: vi.fn().mockResolvedValue({ accountId: () => "GWALLET" }),
}));
vi.mock("@herledger/sdk", () => ({
  deactivateBusiness: vi.fn(),
}));

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/business/deactivate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function activeBusinessDb(overrides: Record<string, unknown> = {}) {
  return createMockDbClient({
    businesses: {
      findAllActiveWallets: vi.fn(),
      findByWallet: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "1",
        userId: "u_1",
        walletAddress: "GWALLET",
        active: true,
        ...overrides,
      }),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deactivate: vi.fn().mockResolvedValue({}),
    },
  });
}

describe("POST /api/business/deactivate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deactivateBusiness).mockResolvedValue(undefined as never);
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

    const res = await POST(jsonRequest({}));
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

  it("returns 400 when the business is already inactive", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(activeBusinessDb({ active: false }));

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("ALREADY_INACTIVE");
  });

  it("deactivates the business on success", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    const mockDb = activeBusinessDb();
    setDbClient(mockDb);

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.success).toBe(true);
    expect(mockDb.businesses.deactivate).toHaveBeenCalledWith("1");
  });

  it("returns 500 when the on-chain call throws", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(activeBusinessDb());
    vi.mocked(deactivateBusiness).mockRejectedValueOnce(new Error("chain error"));

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
