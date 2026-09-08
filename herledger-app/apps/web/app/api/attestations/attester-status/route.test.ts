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

describe("GET /api/attestations/attester-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());
    const req = new NextRequest(
      `http://localhost/api/attestations/attester-status?walletAddress=${WALLET}`
    );

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when walletAddress is missing or malformed", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(createMockDbClient());
    const req = new NextRequest(
      "http://localhost/api/attestations/attester-status?walletAddress=too-short"
    );

    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_PARAMS");
  });

  it("returns isAttester false when no attester profile exists", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        attesters: {
          findByWallet: vi.fn().mockResolvedValue(null),
          upsert: vi.fn(),
        },
      })
    );
    const req = new NextRequest(
      `http://localhost/api/attestations/attester-status?walletAddress=${WALLET}`
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isAttester).toBe(false);
    expect(body.data.displayName).toBeNull();
  });

  it("returns isAttester true with displayName for an active attester", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        attesters: {
          findByWallet: vi.fn().mockResolvedValue({
            walletAddress: WALLET,
            displayName: "Notary Co",
            active: true,
          }),
          upsert: vi.fn(),
        },
      })
    );
    const req = new NextRequest(
      `http://localhost/api/attestations/attester-status?walletAddress=${WALLET}`
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isAttester).toBe(true);
    expect(body.data.displayName).toBe("Notary Co");
  });
});
