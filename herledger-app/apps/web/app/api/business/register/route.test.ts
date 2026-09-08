import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";
import { clearRateLimitStore } from "@/lib/rate-limit";

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

const VALID_BODY = {
  businessId: "a".repeat(64),
  walletAddress: "G" + "A".repeat(55),
  displayName: "Acme Traders",
  metadataHash: "b".repeat(64),
  txHash: "tx-1",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/business/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function existingProfile(overrides: Partial<typeof VALID_BODY> = {}) {
  return {
    id: "biz-row-1",
    userId: "u_1",
    businessId: VALID_BODY.businessId,
    walletAddress: VALID_BODY.walletAddress,
    displayName: VALID_BODY.displayName,
    metadataHash: VALID_BODY.metadataHash,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("POST /api/business/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitStore();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 422 for an invalid body", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(createMockDbClient());

    const res = await POST(makeRequest({ businessId: "too-short" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates a new business profile when nothing conflicts", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    const create = vi.fn().mockResolvedValue({ businessId: VALID_BODY.businessId });
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn().mockResolvedValue(null),
          findById: vi.fn().mockResolvedValue(null),
          findByUserId: vi.fn().mockResolvedValue(null),
          create,
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.businessId).toBe(VALID_BODY.businessId);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u_1", businessId: VALID_BODY.businessId })
    );
  });

  it("replays an idempotent retry (same businessId/wallet/metadataHash) as a 200, without writing again", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    const create = vi.fn();
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue(existingProfile()),
          create,
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.businessId).toBe(VALID_BODY.businessId);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 409 with the existing businessId when this account already has a different business registered", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue(existingProfile({ businessId: "c".repeat(64) })),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("ALREADY_REGISTERED");
    expect(json.error.message).toContain("c".repeat(64));
  });

  it("returns 409 with the existing businessId on a duplicate wallet registration", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn().mockResolvedValue(existingProfile({ businessId: "d".repeat(64) })),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("WALLET_ALREADY_REGISTERED");
    expect(json.error.message).toContain("d".repeat(64));
  });

  it("returns 500 when the database throws unexpectedly", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockRejectedValue(new Error("connection lost")),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
