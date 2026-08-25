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

const businessFindFirstMock = vi.fn();
const disputeFindManyMock = vi.fn();
const disputeCountMock = vi.fn();
vi.mock("@/lib/db/client", () => ({
  getPrismaClient: () => ({
    businessProfile: { findFirst: businessFindFirstMock },
    dispute: { findMany: disputeFindManyMock, count: disputeCountMock },
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

  it("returns 400 when businessId is missing", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);

    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when the business is not owned by the caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    businessFindFirstMock.mockResolvedValueOnce(null);

    const res = await GET(makeRequest("?businessId=biz_1"));
    expect(res.status).toBe(404);
  });

  it("returns paginated disputes on success", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    businessFindFirstMock.mockResolvedValueOnce({ businessId: "biz_1" });
    disputeFindManyMock.mockResolvedValueOnce([
      {
        id: "d1",
        eventId: "ev_1",
        reasonHash: "hash",
        status: "Pending",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
      },
    ]);
    disputeCountMock.mockResolvedValueOnce(1);

    const res = await GET(makeRequest("?businessId=biz_1&offset=0&limit=10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.disputes).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it("returns 500 when the database call throws", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    businessFindFirstMock.mockRejectedValueOnce(new Error("db down"));

    const res = await GET(makeRequest("?businessId=biz_1"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
