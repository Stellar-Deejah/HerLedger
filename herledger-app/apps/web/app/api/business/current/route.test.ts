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

describe("GET /api/business/current", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const mockDb = createMockDbClient();
    setDbClient(mockDb);
    const req = new NextRequest("http://localhost/api/business/current");

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 when business profile not found", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: "u_1" },
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
    const req = new NextRequest("http://localhost/api/business/current");

    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns business data when profile exists", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: "u_1" },
    } as never);
    const mockDb = createMockDbClient({
      businesses: {
        findAllActiveWallets: vi.fn(),
        findByWallet: vi.fn(),
        findById: vi.fn(),
        findByUserId: vi.fn().mockResolvedValue({
          id: "1",
          userId: "u_1",
          businessId: "biz_1",
          walletAddress: "GWALLET",
          displayName: "My Business",
          metadataHash: "hash123",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        create: vi.fn(),
        update: vi.fn(),
        deactivate: vi.fn(),
      },
    });
    setDbClient(mockDb);
    const req = new NextRequest("http://localhost/api/business/current");

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("biz_1");
    expect(json.data.name).toBe("My Business");
  });
});
