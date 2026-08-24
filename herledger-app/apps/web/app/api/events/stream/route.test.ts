import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";
import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";

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
    setDbClient(createMockDbClient());

    const res = await GET(req() as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when the caller has no business profile", async () => {
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

    const res = await GET(req() as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No business profile");
  });

  it("opens an SSE stream with the expected headers for an authenticated business", async () => {
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
        },
      })
    );

    const controller = new AbortController();
    const request = new Request("http://localhost/api/events/stream", {
      signal: controller.signal,
    });

    const res = await GET(request as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");

    // Close the stream immediately so the background timers this route sets
    // up don't keep the test process alive.
    controller.abort();
    await res.body?.cancel();
  });
});
