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

const findFirstMock = vi.fn();
vi.mock("@/lib/db/client", () => ({
  getPrismaClient: () => ({
    businessProfile: { findFirst: findFirstMock },
  }),
}));

const getAttestationsMock = vi.fn();
vi.mock("@/lib/data/attestations", () => ({
  getAttestations: (...args: unknown[]) => getAttestationsMock(...args),
}));

describe("GET /api/attestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/attestations");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid includeRevoked query param", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);

    const req = new NextRequest("http://localhost/api/attestations?includeRevoked=not-a-bool");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PARAMS");
  });

  it("returns an empty list when the user has no business profile", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    findFirstMock.mockResolvedValueOnce(null);
    getAttestationsMock.mockResolvedValueOnce({ attestations: [] });

    const req = new NextRequest("http://localhost/api/attestations");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(getAttestationsMock).toHaveBeenCalledWith(null, false);
  });

  it("returns attestations for the caller's business", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    findFirstMock.mockResolvedValueOnce({ businessId: "biz_1" });
    getAttestationsMock.mockResolvedValueOnce({
      attestations: [{ id: "a1", attestationId: "att_1" }],
    });

    const req = new NextRequest("http://localhost/api/attestations?includeRevoked=true");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(getAttestationsMock).toHaveBeenCalledWith("biz_1", true);
    const body = await res.json();
    expect(body.data.attestations).toHaveLength(1);
  });
});
