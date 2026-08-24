import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";
import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";

import { POST } from "./route";

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
const validBody = {
  walletAddress: WALLET,
  displayName: "Notary Co",
  description: "Independent notary",
  metadataHash: "a".repeat(64),
};

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/attestations/register-attester", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/attestations/register-attester", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());

    const res = await POST(jsonRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when the request body is invalid", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(createMockDbClient());

    const res = await POST(jsonRequest({ walletAddress: "too-short" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("registers the attester and returns 200 on success", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    const upsert = vi.fn().mockResolvedValue({ walletAddress: WALLET });
    setDbClient(
      createMockDbClient({
        attesters: { findByWallet: vi.fn(), upsert },
      })
    );

    const res = await POST(jsonRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.walletAddress).toBe(WALLET);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: WALLET, displayName: "Notary Co", active: true })
    );
  });

  it("returns 500 when the db upsert throws", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        attesters: {
          findByWallet: vi.fn(),
          upsert: vi.fn().mockRejectedValue(new Error("db down")),
        },
      })
    );

    const res = await POST(jsonRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
