import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const { findFirstMock: _findFirstMock, getAttestationsMock: _getAttestationsMock } = vi.hoisted(
  () => ({
    findFirstMock: vi.fn(),
    getAttestationsMock: vi.fn(),
  })
);
const { mockFindFirst, mockGetAttestations } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockGetAttestations: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getPrismaClient: () => ({
    businessProfile: { findFirst: mockFindFirst },
  }),
}));

vi.mock("@/lib/data/attestations", () => ({
  getAttestations: (...args: unknown[]) => mockGetAttestations(...args),
}));

describe("GET /api/attestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitStore();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/attestations");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 422 for an invalid includeRevoked query param", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);

    const req = new NextRequest("http://localhost/api/attestations?includeRevoked=not-a-bool");
    const res = await GET(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PARAMS");
  });

  it("returns an empty list when the user has no business profile", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    mockFindFirst.mockResolvedValueOnce(null);
    mockGetAttestations.mockResolvedValueOnce({ attestations: [] });

    const req = new NextRequest("http://localhost/api/attestations");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.attestations).toEqual([]);
    expect(mockGetAttestations).toHaveBeenCalledWith(null, false);
  });

  it("projects all fields when the user is a business owner", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    mockFindFirst.mockResolvedValueOnce({ businessId: "biz_1" });
    mockGetAttestations.mockResolvedValueOnce({
      attestations: [
        {
          id: "1",
          attestationId: "att_1",
          eventId: "ev_1",
          attesterAddress: "addr_1",
          claimHash: "hash_1",
          claimDescription: "desc_1",
          status: "Active",
          ledgerSequence: 100,
        },
      ],
    });

    const req = new NextRequest("http://localhost/api/attestations");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.attestations[0]).toHaveProperty("claimHash");
  });
});
