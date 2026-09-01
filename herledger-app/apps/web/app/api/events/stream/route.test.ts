import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
});

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

function req() {
  return new Request("http://localhost/api/events/stream", {
    signal: new AbortController().signal,
  });
}

describe("GET /api/events/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns 404 when user has no business profile", async () => {
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

    const res = await GET(req());
    expect(res.status).toBe(404);
  });

  it("returns an SSE stream of updated financial events", async () => {
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
          findById: vi.fn(),
          findUpdatedAfter: vi.fn().mockResolvedValue([]),
          findAttestableEvents: vi.fn(),
          summarize: vi.fn(),
        },
      })
    );

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");

    // Close the stream reader immediately to finish test
    const reader = res.body?.getReader();
    await reader?.cancel();
  });
});
