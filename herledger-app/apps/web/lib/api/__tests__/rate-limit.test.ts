import { describe, it, expect } from "vitest";

import { rateLimit } from "../rate-limit";

describe("rateLimit", () => {
  it("allows requests within the limit", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 3 });
    expect(limiter.check("test-ip")).toBeNull();
    expect(limiter.check("test-ip")).toBeNull();
    expect(limiter.check("test-ip")).toBeNull();
    // 4th should be blocked
    const response = limiter.check("test-ip");
    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
  });

  it("returns correct envelope on 429", async () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 1 });
    limiter.check("test-ip"); // first: OK
    const response = limiter.check("test-ip"); // second: blocked
    expect(response).not.toBeNull();

    const body = await response!.json();
    expect(body).toEqual({
      data: null,
      error: {
        code: "RATE_LIMITED",
        message: expect.stringContaining("Too many requests"),
      },
    });
  });

  it("includes Retry-After and X-RateLimit-* headers", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 1 });
    limiter.check("test-ip");
    const response = limiter.check("test-ip");
    expect(response).not.toBeNull();
    expect(response!.headers.get("Retry-After")).toBeTruthy();
    expect(response!.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(response!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response!.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("isolates different keys", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 1 });
    expect(limiter.check("ip-a")).toBeNull();
    expect(limiter.check("ip-b")).toBeNull();
    // Both should be blocked on next request
    expect(limiter.check("ip-a")).not.toBeNull();
    expect(limiter.check("ip-b")).not.toBeNull();
  });

  it("resets allow count after window expires", async () => {
    const limiter = rateLimit({ windowMs: 50, maxRequests: 1 }); // 50ms window
    expect(limiter.check("test-ip")).toBeNull();
    expect(limiter.check("test-ip")).not.toBeNull(); // blocked

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));
    expect(limiter.check("test-ip")).toBeNull(); // allowed again
  });

  it("_getCount returns the current request count", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 10 });
    expect(limiter._getCount("key")).toBe(0);
    limiter.check("key");
    limiter.check("key");
    expect(limiter._getCount("key")).toBe(2);
  });

  it("_reset clears all entries", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 10 });
    limiter.check("a");
    limiter.check("b");
    limiter._reset();
    expect(limiter._getCount("a")).toBe(0);
    expect(limiter._getCount("b")).toBe(0);
  });
});
