import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";
import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";

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
        findByBusiness: vi.fn().mockResolvedValue([
          { eventId: "ev_1", businessId: "biz_1", ledgerSequence: 100 },
        ] as never),
        findRecentByBusiness: vi.fn(),
        findById: vi.fn(),
        findUpdatedAfter: vi.fn(),
        findAttestableEvents: vi.fn(),
      },
    });
    setDbClient(mockDb);

    const req = new NextRequest("http://localhost/api/activity/recent?offset=0&limit=10");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockDb.financialEvents.findByBusiness).toHaveBeenCalledWith("biz_1", 0, 10);
    const body = await res.json();
    expect(body.data.events).toHaveLength(1);
    expect(body.data.pagination.count).toBe(1);
  });
});
