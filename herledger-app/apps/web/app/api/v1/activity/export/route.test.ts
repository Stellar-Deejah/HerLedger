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

const BUSINESS_PROFILE = {
  id: "1",
  userId: "user_1",
  businessId: "biz_1",
  walletAddress: "G1",
  displayName: "Biz",
  metadataHash: "hash",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cuid_1",
    businessId: "biz_1",
    eventId: "ev_1",
    eventType: "PaymentReceived",
    assetAddress: "CASSET",
    amount: "1005000000",
    stellarReference: "ref_1",
    metadataHash: "hash",
    status: "Verified",
    ledgerSequence: 555,
    createdAt: new Date("2026-01-15T12:30:00.000Z"),
    updatedAt: new Date("2026-01-15T12:30:00.000Z"),
    ...overrides,
  };
}

async function readBody(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("GET /api/v1/activity/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());
    const req = new NextRequest("http://localhost/api/v1/activity/export");

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for a malformed date param", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "user_1" } } as never);
    setDbClient(createMockDbClient());
    const req = new NextRequest("http://localhost/api/v1/activity/export?startDate=nope");

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("streams only a header row when the business has no events", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "user_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue(BUSINESS_PROFILE),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
        financialEvents: {
          upsert: vi.fn(),
          updateStatus: vi.fn(),
          findByBusiness: vi.fn(),
          findRecentByBusiness: vi.fn().mockResolvedValue([]),
          findById: vi.fn(),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn(),
          summarize: vi.fn(),
        },
      })
    );
    const req = new NextRequest("http://localhost/api/v1/activity/export");

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const body = await readBody(res);
    expect(body).toBe(
      "id,eventId,eventType,assetAddress,amount,status,stellarReference,ledgerSequence,createdAt\r\n"
    );
  });

  it("streams every page of matching events as CSV rows", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "user_1" } } as never);
    const findRecentByBusiness = vi
      .fn()
      .mockResolvedValueOnce([makeEvent({ eventId: "ev_1" }), makeEvent({ eventId: "ev_2" })])
      .mockResolvedValueOnce([]);

    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue(BUSINESS_PROFILE),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
        financialEvents: {
          upsert: vi.fn(),
          updateStatus: vi.fn(),
          findByBusiness: vi.fn(),
          findRecentByBusiness,
          findById: vi.fn(),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn(),
          summarize: vi.fn(),
        },
      })
    );

    const req = new NextRequest(
      "http://localhost/api/v1/activity/export?startDate=2026-01-01&endDate=2026-01-31"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await readBody(res);
    const lines = body.trim().split("\r\n");
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain("ev_1");
    expect(lines[2]).toContain("ev_2");

    expect(findRecentByBusiness).toHaveBeenCalledWith(
      "biz_1",
      expect.objectContaining({
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-01-31T23:59:59.999Z"),
      })
    );
  });
});
