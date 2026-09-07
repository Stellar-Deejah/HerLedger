import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";
import { getAttestations } from "@/lib/data/attestations";

const { mockFindFirst } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/db/client", () => ({
  getPrismaClient: () => ({
    businessProfile: {
      findFirst: mockFindFirst,
    },
  }),
}));
vi.mock("@/lib/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));
vi.mock("@/lib/data/attestations", () => ({
  getAttestations: vi.fn(),
}));

import { GET } from "../route";

describe("GET /api/attestations", () => {
  const mockAttestation = {
    id: "att-1",
    attestationId: "attest-hash-1",
    eventId: "evt-1",
    attesterAddress: "GATTESTER12345678901234567890123456789012345678901234567",
    claimHash: "0xclaimhash123",
    claimDescription: "Audit Verified",
    status: "Active" as const,
    ledgerSequence: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost/api/attestations");

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("includes claimHash in response when requester is business owner", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: "user_owner" },
    } as never);

    mockFindFirst.mockResolvedValue({
      businessId: "biz_1",
    });

    vi.mocked(getAttestations).mockResolvedValueOnce({
      attestations: [mockAttestation],
    });

    const req = new NextRequest("http://localhost/api/attestations");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.attestations[0]).toHaveProperty("claimHash", "0xclaimhash123");
  });

  it("omits claimHash from response when requester is not a business owner", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: "user_viewer" },
    } as never);

    mockFindFirst.mockResolvedValue(null);

    vi.mocked(getAttestations).mockResolvedValueOnce({
      attestations: [mockAttestation],
    });

    const req = new NextRequest("http://localhost/api/attestations");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.attestations[0]).not.toHaveProperty("claimHash");
    expect(json.data.attestations[0]).toHaveProperty("attestationId", "attest-hash-1");
  });
});
