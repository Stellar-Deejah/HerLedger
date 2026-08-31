import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  QueryCache,
  buildCacheKey,
  defaultQueryCache,
  clearQueryCache,
} from "../cache/query-cache.js";

describe("QueryCache", () => {
  it("caches a result and serves subsequent calls from cache (no second loader call)", async () => {
    const cache = new QueryCache();
    const loader = vi.fn().mockResolvedValue("value-1");

    const first = await cache.get("key", loader);
    const second = await cache.get("key", loader);

    expect(first).toBe("value-1");
    expect(second).toBe("value-1");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("de-duplicates concurrent in-flight calls for the same key into a single loader invocation", async () => {
    const cache = new QueryCache();
    let resolveLoader!: (value: string) => void;
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve;
        })
    );

    const p1 = cache.get("key", loader);
    const p2 = cache.get("key", loader);
    resolveLoader("shared-value");

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe("shared-value");
    expect(r2).toBe("shared-value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("re-fetches once the TTL has expired", async () => {
    vi.useFakeTimers();
    try {
      const cache = new QueryCache();
      const loader = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");

      const first = await cache.get("key", loader, { ttlMs: 1_000 });
      expect(first).toBe("v1");

      vi.advanceTimersByTime(1_001);

      const second = await cache.get("key", loader, { ttlMs: 1_000 });
      expect(second).toBe("v2");
      expect(loader).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("bypasses the cache entirely when bypassCache is set, always calling the loader", async () => {
    const cache = new QueryCache();
    const loader = vi.fn().mockResolvedValue("fresh");

    await cache.get("key", loader);
    await cache.get("key", loader, { bypassCache: true });

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not cache a rejected loader result, and allows retry on the next call", async () => {
    const cache = new QueryCache();
    const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");

    await expect(cache.get("key", loader)).rejects.toThrow("boom");
    const result = await cache.get("key", loader);

    expect(result).toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("invalidate removes a single cached entry", async () => {
    const cache = new QueryCache();
    const loader = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");

    await cache.get("key", loader);
    cache.invalidate("key");
    const result = await cache.get("key", loader);

    expect(result).toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("clear empties the cache and in-flight state", async () => {
    const cache = new QueryCache();
    await cache.get("key", async () => "v1");
    expect(cache.size).toBe(1);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("keys are isolated per contract id + method + args", async () => {
    const cache = new QueryCache();
    const loaderA = vi.fn().mockResolvedValue("a");
    const loaderB = vi.fn().mockResolvedValue("b");

    const keyA = buildCacheKey("C_CONTRACT", "get_business", ["id-1"]);
    const keyB = buildCacheKey("C_CONTRACT", "get_business", ["id-2"]);

    expect(keyA).not.toBe(keyB);
    expect(await cache.get(keyA, loaderA)).toBe("a");
    expect(await cache.get(keyB, loaderB)).toBe("b");
  });

  it("buildCacheKey handles bigint args without throwing", () => {
    const key = buildCacheKey("C_CONTRACT", "get_event", [123n, "abc"]);
    expect(key).toContain("C_CONTRACT");
    expect(key).toContain("get_event");
  });
});

describe("defaultQueryCache / clearQueryCache", () => {
  beforeEach(() => {
    clearQueryCache();
  });

  it("clearQueryCache resets the shared singleton", async () => {
    const loader = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");
    await defaultQueryCache.get("shared-key", loader);
    clearQueryCache();
    const result = await defaultQueryCache.get("shared-key", loader);

    expect(result).toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
