import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const { businessFindFirstMock, disputeFindManyMock, disputeCountMock } = vi.hoisted(() => ({
  businessFindFirstMock: vi.fn(),
  disputeFindManyMock: vi.fn(),
  disputeCountMock: vi.fn(),
}));
const { mockBusinessFindFirst, mockDisputeFindMany, mockDisputeCount } = vi.hoisted(() => ({
  mockBusinessFindFirst: vi.fn(),
  mockDisputeFindMany: vi.fn(),
  mockDisputeCount: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getPrismaClient: () => ({
    businessProfile: { findFirst: mockBusinessFindFirst },
    dispute: { findMany: mockDisputeFindMany, count: mockDisputeCount },
  }),
}));

function makeRequest(query: string) {
  return new NextRequest(`http://localhost/api/disputes${query}`);
}

describe("GET /api/disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const res = await GET(makeRequest("?businessId=biz_1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when businessId parameter is missing", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);

    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns 404 when business profile is not found or not owned by user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    mockBusinessFindFirst.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("?businessId=biz_1"));
    expect(res.status).toBe(404);
  });

  it("returns disputes with pagination when authorized", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    mockBusinessFindFirst.mockResolvedValueOnce({ id: "b1", businessId: "biz_1", userId: "u_1" });
    mockDisputeFindMany.mockResolvedValueOnce([
      {
        id: "d1",
        eventId: "ev_1",
        reasonHash: "hash1",
        status: "Submitted",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ]);
    mockDisputeCount.mockResolvedValueOnce(1);

    const res = await GET(makeRequest("?businessId=biz_1&offset=0&limit=10"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual({
      disputes: [
        {
          id: "d1",
          eventId: "ev_1",
          reasonHash: "hash1",
          status: "Submitted",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
      offset: 0,
      limit: 10,
    });
  });
});
