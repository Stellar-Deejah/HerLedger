import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";
import { clearRateLimitStore } from "@/lib/rate-limit";

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

describe("GET /api/activity/recent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitStore();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const mockDb = createMockDbClient();
    setDbClient(mockDb);
    const req = new NextRequest("http://localhost/api/activity/recent");

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns empty events list when business profile is not found", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: "user_1" },
    } as never);
    const mockDb = createMockDbClient({
      businesses: {
        findAllActiveWallets: vi.fn(),
        findByWallet: vi.fn(),
        findById: vi.fn(),
        findByUserId: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
        deactivate: vi.fn(),
      },
    });
    setDbClient(mockDb);
    const req = new NextRequest("http://localhost/api/activity/recent");

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.events).toEqual([]);
  });

  it("returns 422 when limit exceeds max 100", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "user_1" } } as never);
    setDbClient(createMockDbClient());
    const req = new NextRequest("http://localhost/api/activity/recent?limit=100000");
    const res = await GET(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("INVALID_PARAMS");
    expect(body.error.message).toBeDefined();
    expect(body.meta).toBeNull();
  });

  it("returns 422 when limit is 101", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "user_1" } } as never);
    setDbClient(createMockDbClient());
    const req = new NextRequest("http://localhost/api/activity/recent?limit=101");
    const res = await GET(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PARAMS");
  });

  it("returns 422 when offset is negative", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "user_1" } } as never);
    setDbClient(createMockDbClient());
    const req = new NextRequest("http://localhost/api/activity/recent?offset=-1&limit=10");
    const res = await GET(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PARAMS");
  });

  it("queries financial events via injected db client", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: "user_1" },
    } as never);

    const mockDb = createMockDbClient({
      businesses: {
        findAllActiveWallets: vi.fn(),
        findByWallet: vi.fn(),
        findById: vi.fn(),
        findByUserId: vi.fn().mockResolvedValue({
          id: "1",
          userId: "user_1",
          businessId: "biz_1",
          walletAddress: "G1",
          displayName: "Biz",
          metadataHash: "hash",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        create: vi.fn(),
        update: vi.fn(),
        deactivate: vi.fn(),
      },
      financialEvents: {
        upsert: vi.fn(),
        updateStatus: vi.fn(),
        findByBusiness: vi.fn(),
        findRecentByBusiness: vi
          .fn()
          .mockResolvedValue([
            { eventId: "ev_1", businessId: "biz_1", ledgerSequence: 100 },
          ] as never),
        findById: vi.fn(),
        findUpdatedAfter: vi.fn(),
        findAttestableEvents: vi.fn(),
        summarize: vi.fn(),
      },
    });
    setDbClient(mockDb);

    const req = new NextRequest("http://localhost/api/activity/recent?offset=0&limit=10");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.financialEvents.findRecentByBusiness).toHaveBeenCalledWith("biz_1", {
      offset: 0,
      limit: 10,
    });
    const body = await res.json();
    expect(body.data.events).toHaveLength(1);
    expect(body.data.pagination.count).toBe(1);
  });
});
