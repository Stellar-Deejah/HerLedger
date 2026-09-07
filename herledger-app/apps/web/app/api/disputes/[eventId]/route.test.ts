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

const { mockDecryptDisputeReason, MockDisputeDecryptionError } = vi.hoisted(() => {
  class MockErr extends Error {}
  return {
    mockDecryptDisputeReason: vi.fn(),
    MockDisputeDecryptionError: MockErr,
  };
});

vi.mock("@/lib/crypto/dispute-encryption", () => ({
  decryptDisputeReason: (...args: unknown[]) => mockDecryptDisputeReason(...args),
  DisputeDecryptionError: MockDisputeDecryptionError,
}));

vi.mock("@/lib/disputes/status", () => ({
  deriveDisputeLifecycleStatus: vi.fn((_eventStatus: string, storedStatus: string) => storedStatus),
}));

function ctx(eventId: string) {
  return { params: Promise.resolve({ eventId }) };
}

describe("GET /api/disputes/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    setDbClient(createMockDbClient());

    const req = new NextRequest("http://localhost/api/disputes/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the user has no business profile", async () => {
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

    const req = new NextRequest("http://localhost/api/disputes/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when the event is not found", async () => {
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
          summarize: vi.fn(),
        },
      })
    );

    const req = new NextRequest("http://localhost/api/disputes/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(404);
  });

  it("returns the decrypted dispute on success", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    mockDecryptDisputeReason.mockReturnValueOnce("plain reason");
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
          findById: vi.fn().mockResolvedValue({ businessId: "biz_1", status: "Disputed" }),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn(),
          summarize: vi.fn(),
        },
        disputes: {
          findByEventId: vi.fn().mockResolvedValue({
            id: "d1",
            eventId: "ev_1",
            userId: "u_1",
            status: "Submitted",
            reasonPlaintext: "iv:tag:ct",
            reasonHash: "hash",
            submittedAt: new Date(),
            resolvedAt: null,
            resolutionTxHash: null,
          }),
          create: vi.fn(),
        },
        prisma: { dispute: { update: vi.fn() } } as never,
      })
    );

    const req = new NextRequest("http://localhost/api/disputes/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.dispute.reasonPlaintext).toBe("plain reason");
  });

  it("returns 500 when decryption fails", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: "u_1" } } as never);
    mockDecryptDisputeReason.mockImplementationOnce(() => {
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
          findById: vi.fn().mockResolvedValue({ businessId: "biz_1", status: "Disputed" }),
          findUpdatedAfter: vi.fn(),
          findAttestableEvents: vi.fn(),
          summarize: vi.fn(),
        },
        disputes: {
          findByEventId: vi.fn().mockResolvedValue({
            id: "d1",
            eventId: "ev_1",
            userId: "u_1",
            status: "Submitted",
            reasonPlaintext: "iv:tag:ct",
            reasonHash: "hash",
            submittedAt: new Date(),
            resolvedAt: null,
            resolutionTxHash: null,
          }),
          create: vi.fn(),
        },
        prisma: { dispute: { update: vi.fn() } } as never,
      })
    );

    const req = new NextRequest("http://localhost/api/disputes/ev_1");
    const res = await GET(req, ctx("ev_1"));
    expect(res.status).toBe(500);
  });
});
