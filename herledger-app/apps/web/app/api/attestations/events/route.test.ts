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

const WALLET = "G".repeat(56);

describe("GET /api/attestations/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());
    const req = new NextRequest(`http://localhost/api/attestations/events?walletAddress=${WALLET}`);

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when walletAddress is missing", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(createMockDbClient());
    const req = new NextRequest("http://localhost/api/attestations/events");

    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PARAMS");
  });

  it("returns 400 when pagination params are invalid", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(createMockDbClient());
    const req = new NextRequest(
      `http://localhost/api/attestations/events?walletAddress=${WALLET}&offset=-1&limit=9999`
    );

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when the wallet is not a registered, active attester", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        attesters: { findByWallet: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
      })
    );
    const req = new NextRequest(
      `http://localhost/api/attestations/events?walletAddress=${WALLET}&offset=0&limit=10`
    );

    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns attestable events for an active attester", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        attesters: {
          findByWallet: vi.fn().mockResolvedValue({ walletAddress: WALLET, active: true }),
          upsert: vi.fn(),
        },
        financialEvents: {
          upsert: vi.fn(),
          updateStatus: vi.fn(),
          findByBusiness: vi.fn(),
          findRecentByBusiness: vi.fn(),
          findById: vi.fn(),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn().mockResolvedValue([{ eventId: "ev_1" }]),
          summarize: vi.fn(),
        },
      })
    );
    const req = new NextRequest(
      `http://localhost/api/attestations/events?walletAddress=${WALLET}&offset=0&limit=10`
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.events).toHaveLength(1);
    expect(body.data.pagination.count).toBe(1);
  });
});
