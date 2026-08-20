import { NextRequest } from "next/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/server", () => ({ auth: {} }));

let mockStatus = 200;
let mockHeaders = new Headers();

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({
    GET: async () => new Response(null, { status: 200 }),
    POST: async () =>
      new Response(JSON.stringify({ message: "test" }), {
        status: mockStatus,
        headers: mockHeaders,
      }),
  }),
}));

// Must be imported after the vi.mock() calls above register (module-level
// mocks are hoisted by Vitest regardless of import order, but the
// route module reads `toNextJsHandler(auth)` at its own top level, so the
// mocked factory needs to already be in place before this import runs).
const { POST } = await import("./route");

function req() {
  return new NextRequest("http://localhost:3000/api/auth/sign-in/email", { method: "POST" });
}

describe("POST /api/auth/[...all] -- Retry-After mirroring", () => {
  it("mirrors Better Auth's x-retry-after onto the standard Retry-After header on a 429", async () => {
    mockStatus = 429;
    mockHeaders = new Headers({ "x-retry-after": "900" });

    const res = await POST(req());

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("900");
    expect(res.headers.get("x-retry-after")).toBe("900");
  });

  it("leaves a non-429 response untouched", async () => {
    mockStatus = 200;
    mockHeaders = new Headers();

    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(res.headers.get("retry-after")).toBeNull();
  });

  it("does not overwrite an already-present Retry-After header", async () => {
    mockStatus = 429;
    mockHeaders = new Headers({ "x-retry-after": "900", "retry-after": "42" });

    const res = await POST(req());

    expect(res.headers.get("retry-after")).toBe("42");
  });
});
