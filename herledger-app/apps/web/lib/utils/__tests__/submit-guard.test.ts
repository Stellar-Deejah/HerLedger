import { describe, it, expect, vi } from "vitest";

import { runExclusive } from "../submit-guard.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("runExclusive", () => {
  it("runs fn and returns its result when not already submitting", async () => {
    const flag = { current: false };
    const fn = vi.fn(async () => "ok");

    const result = await runExclusive(flag, fn);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("skips a second call that starts while the first is still in flight", async () => {
    const flag = { current: false };
    const first = deferred<string>();
    const fn = vi.fn(() => first.promise);

    // Simulates two rapid submits (e.g. double Enter) before the first
    // request resolves — the second call must not invoke fn again.
    const firstCall = runExclusive(flag, fn);
    const secondCall = runExclusive(flag, fn);

    expect(fn).toHaveBeenCalledTimes(1);

    first.resolve("first result");
    const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);

    expect(firstResult).toBe("first result");
    expect(secondResult).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("allows a new call once the previous one has resolved", async () => {
    const flag = { current: false };
    const fn = vi.fn(async () => "ok");

    await runExclusive(flag, fn);
    await runExclusive(flag, fn);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("resets the flag even when fn throws, so the form isn't permanently locked", async () => {
    const flag = { current: false };
    const fn = vi.fn(async () => {
      throw new Error("network error");
    });

    await expect(runExclusive(flag, fn)).rejects.toThrow("network error");
    expect(flag.current).toBe(false);

    const fn2 = vi.fn(async () => "recovered");
    const result = await runExclusive(flag, fn2);
    expect(result).toBe("recovered");
  });
});
