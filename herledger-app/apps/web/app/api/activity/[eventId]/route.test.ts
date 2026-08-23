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
vi.mock("@herledger/config/server", () => ({
  getServerEnv: vi.fn(() => ({ BETTER_AUTH_SECRET: "test-secret-at-least-32-characters" })),
}));

// vi.mock() factories are hoisted above module-scope declarations, so a
// plain `class`/`const` referenced inside one is still in its temporal dead
// zone when the factory runs -- vi.hoisted() is the escape hatch that makes
// these safely accessible from the (also hoisted) mock factory below.
const { decryptDisputeReasonMock, MockDisputeDecryptionError } = vi.hoisted(() => {
  class MockDisputeDecryptionError extends Error {}
  return { decryptDisputeReasonMock: vi.fn(), MockDisputeDecryptionError };
});
vi.mock("@/lib/crypto/dispute-encryption", () => ({
  decryptDisputeReason: (...args: unknown[]) => decryptDisputeReasonMock(...args),
  DisputeDecryptionError: MockDisputeDecryptionError,
}));

function ctx(eventId: string) {
  return { params: Promise.resolve({ eventId }) };
}

const baseEvent = {
  id: "evtcuid1",
  businessId: "biz_1",
  eventId: "ev_1",
  eventType: "PaymentReceived",
  assetAddress: "native",
  amount: "10000000",
  status: "Verified",
  stellarReference: "ref_1",
  metadataHash: "hash",
  ledgerSequence: 100,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("GET /api/activity/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    decryptDisputeReasonMock.mockReturnValue("plain reason");
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());

    const req = new NextRequest("http://localhost/api/activity/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when eventId is empty", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(createMockDbClient());

    const req = new NextRequest("http://localhost/api/activity/");
    const res = await GET(req, ctx(""));
    expect(res.status).toBe(400);
  });

  it("returns 403 when the caller has no business profile", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
      })
    );

    const req = new NextRequest("http://localhost/api/activity/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when the financial event does not exist", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue({ businessId: "biz_1" }),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
        financialEvents: {
          upsert: vi.fn(),
          updateStatus: vi.fn(),
          findByBusiness: vi.fn(),
          findRecentByBusiness: vi.fn(),
          findById: vi.fn().mockResolvedValue(null),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn(),
        },
      })
    );

    const req = new NextRequest("http://localhost/api/activity/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the event belongs to a different business", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue({ businessId: "biz_owner" }),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
        financialEvents: {
          upsert: vi.fn(),
          updateStatus: vi.fn(),
          findByBusiness: vi.fn(),
          findRecentByBusiness: vi.fn(),
          findById: vi.fn().mockResolvedValue({ ...baseEvent, businessId: "biz_other" }),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn(),
        },
      })
    );

    const req = new NextRequest("http://localhost/api/activity/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(403);
  });

  it("returns the event with decrypted disputes, attestations, and stellar transaction on success", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue({ businessId: "biz_1" }),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
        financialEvents: {
          upsert: vi.fn(),
          updateStatus: vi.fn(),
          findByBusiness: vi.fn(),
          findRecentByBusiness: vi.fn(),
          findById: vi.fn().mockResolvedValue(baseEvent),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn(),
        },
        attestations: {
          upsert: vi.fn(),
          upsertClaimDescription: vi.fn(),
          findByEvent: vi.fn().mockResolvedValue([
            {
              id: "att1",
              attestationId: "attn_1",
              eventId: "ev_1",
              attesterAddress: "GATTESTER",
              claimHash: "claim_hash",
              claimDescription: "Payment for services",
              status: "Active",
              ledgerSequence: 90,
              createdAt: new Date("2026-01-01T00:00:00Z"),
              updatedAt: new Date("2026-01-01T00:00:00Z"),
            },
          ]),
          findByBusiness: vi.fn(),
          findById: vi.fn(),
          findByAttestationIdAndBusiness: vi.fn(),
        },
        disputes: {
          findByEventId: vi.fn(),
          findAllByEventId: vi.fn().mockResolvedValue([
            {
              id: "d1",
              eventId: "ev_1",
              userId: "u_1",
              status: "Submitted",
              reasonPlaintext: "iv:tag:ct",
              reasonHash: "hash",
              submittedAt: new Date("2026-01-02T00:00:00Z"),
              resolvedAt: null,
              resolutionTxHash: null,
              createdAt: new Date("2026-01-02T00:00:00Z"),
              updatedAt: new Date("2026-01-02T00:00:00Z"),
            },
          ]),
          create: vi.fn(),
        },
        stellarTransactions: {
          upsert: vi.fn(),
          findByHash: vi.fn().mockResolvedValue({
            hash: "ref_1",
            ledgerSequence: 100,
            successful: true,
            sourceAddress: "GSOURCE",
            createdAt: new Date("2026-01-01T00:00:00Z"),
          }),
        },
      })
    );

    const req = new NextRequest("http://localhost/api/activity/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.event.eventId).toBe("ev_1");
    expect(body.data.attestations).toHaveLength(1);
    expect(body.data.disputes).toHaveLength(1);
    expect(body.data.disputes[0].reason).toBe("plain reason");
    expect(body.data.stellarTransaction.hash).toBe("ref_1");
  });

  it("returns 500 when dispute decryption fails", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    decryptDisputeReasonMock.mockImplementationOnce(() => {
      throw new MockDisputeDecryptionError("bad key");
    });
    setDbClient(
      createMockDbClient({
        businesses: {
          findAllActiveWallets: vi.fn(),
          findByWallet: vi.fn(),
          findById: vi.fn(),
          findByUserId: vi.fn().mockResolvedValue({ businessId: "biz_1" }),
          create: vi.fn(),
          update: vi.fn(),
          deactivate: vi.fn(),
        },
        financialEvents: {
          upsert: vi.fn(),
          updateStatus: vi.fn(),
          findByBusiness: vi.fn(),
          findRecentByBusiness: vi.fn(),
          findById: vi.fn().mockResolvedValue(baseEvent),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn(),
        },
        disputes: {
          findByEventId: vi.fn(),
          findAllByEventId: vi.fn().mockResolvedValue([
            {
              id: "d1",
              eventId: "ev_1",
              userId: "u_1",
              status: "Submitted",
              reasonPlaintext: "iv:tag:ct",
              reasonHash: "hash",
              submittedAt: new Date(),
              resolvedAt: null,
              resolutionTxHash: null,
            },
          ]),
          create: vi.fn(),
        },
      })
    );

    const req = new NextRequest("http://localhost/api/activity/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(500);
  });
});
