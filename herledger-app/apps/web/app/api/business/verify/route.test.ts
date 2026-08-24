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
  return new NextRequest("http://localhost/api/business/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/business/verify", () => {
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

  it("returns 400 when businessId is missing", async () => {
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

  it("returns 404 when the business does not exist on-chain", async () => {
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
    vi.mocked(getBusiness).mockResolvedValueOnce(null as never);

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND_ON_CHAIN");
  });

  it("reports no discrepancies when DB and chain agree", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn().mockResolvedValue({
            id: "1",
            userId: "u_1",
            walletAddress: "GWALLET",
            metadataHash: "hash1",
            active: true,
          }),
          findByUserId: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );
    vi.mocked(getBusiness).mockResolvedValueOnce({
      wallet: "GWALLET",
      metadataHash: "hash1",
      active: true,
    } as never);

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.upToDate).toBe(true);
    expect(body.data.discrepancies).toHaveLength(0);
  });

  it("reports discrepancies when DB and chain disagree", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn().mockResolvedValue({
            id: "1",
            userId: "u_1",
            walletAddress: "GWALLET_OLD",
            metadataHash: "hash1",
            active: true,
          }),
          findByUserId: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );
    vi.mocked(getBusiness).mockResolvedValueOnce({
      wallet: "GWALLET_NEW",
      metadataHash: "hash2",
      active: false,
    } as never);

    const res = await POST(jsonRequest({ businessId: "biz_1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.upToDate).toBe(false);
    expect(body.data.discrepancies).toHaveLength(3);
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
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
