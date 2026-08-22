import { describe, it, expect, vi, afterEach } from "vitest";
import { withRpcTimeout, DEFAULT_RPC_TIMEOUT_MS } from "../rpc/timeout.js";
import { RpcError } from "../errors/index.js";

describe("withRpcTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the underlying value when it settles before the deadline", async () => {
    const result = await withRpcTimeout(Promise.resolve("ok"), { timeoutMs: 1_000 });
    expect(result).toBe("ok");
  });

  it("rejects with an RpcError coded TIMEOUT when the deadline elapses first", async () => {
    vi.useFakeTimers();
    const never = new Promise<string>(() => {
      /* never settles */
    });

    const promise = withRpcTimeout(never, { timeoutMs: 5_000 });
    const assertion = expect(promise).rejects.toMatchObject({
      name: "RpcError",
      code: "TIMEOUT",
    });

    await vi.advanceTimersByTimeAsync(5_001);
    await assertion;
  });

  it("rejects with RpcError TIMEOUT immediately if the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      withRpcTimeout(new Promise(() => {}), { signal: controller.signal, timeoutMs: 30_000 })
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("rejects with RpcError TIMEOUT when the signal aborts mid-flight", async () => {
    const controller = new AbortController();
    const never = new Promise<string>(() => {
      /* never settles */
    });

    const promise = withRpcTimeout(never, { signal: controller.signal, timeoutMs: 30_000 });
    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(RpcError);
    await expect(promise).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("propagates the underlying rejection when it fails before the deadline", async () => {
    await expect(
      withRpcTimeout(Promise.reject(new Error("boom")), { timeoutMs: 1_000 })
    ).rejects.toThrow("boom");
  });

  it("defaults to a 30s timeout when none is supplied", () => {
    expect(DEFAULT_RPC_TIMEOUT_MS).toBe(30_000);
  });
});
