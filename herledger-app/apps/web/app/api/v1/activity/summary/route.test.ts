import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";

import { GET } from "./route";

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

const BUSINESS_PROFILE = {
  id: "1",
  userId: "user_1",
  businessId: "biz_1",
  walletAddress: "G1",
  displayName: "Biz",
  metadataHash: "hash",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /api/v1/activity/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());
    const req = new NextRequest("http://localhost/api/v1/activity/summary");

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for a malformed date param", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "user_1" } } as never);
    setDbClient(createMockDbClient());
    const req = new NextRequest("http://localhost/api/v1/activity/summary?startDate=not-a-date");

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns a zeroed summary when the user has no business profile", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "user_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );
    const req = new NextRequest("http://localhost/api/v1/activity/summary");

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({
      totalReceived: "0",
      totalSent: "0",
      netBalance: "0",
      countByStatus: { Pending: 0, Verified: 0, Disputed: 0, Revoked: 0 },
    });
  });

  it("forwards the parsed date range to the summarize query", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "user_1" } } as never);
    const summarize = vi.fn().mockResolvedValue({
      totalReceived: "5000000000",
      totalSent: "1000000000",
      netBalance: "4000000000",
      countByStatus: { Pending: 1, Verified: 2, Disputed: 0, Revoked: 0 },
    });
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue(BUSINESS_PROFILE),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
        financialEvents: {
          upsert: vi.fn(),
          updateStatus: vi.fn(),
          findByBusiness: vi.fn(),
          findRecentByBusiness: vi.fn(),
          findById: vi.fn(),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn(),
          summarize,
        },
      })
    );

    const req = new NextRequest(
      "http://localhost/api/v1/activity/summary?startDate=2026-01-01&endDate=2026-01-31"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(summarize).toHaveBeenCalledWith(
      "biz_1",
      expect.objectContaining({
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-01-31T23:59:59.999Z"),
      })
    );
    const body = await res.json();
    expect(body.data.netBalance).toBe("4000000000");
  });
});
