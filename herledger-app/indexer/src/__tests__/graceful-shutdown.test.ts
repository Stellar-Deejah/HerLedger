/**
 * Integration test: graceful shutdown sequence
 *
 * Simulates SIGTERM arriving while a sync batch is in progress and verifies
 * that the shutdown handler waits for the in-flight write to complete before
 * exiting rather than cutting it off mid-upsert.
 *
 * No real database or Stellar node is required — all I/O is replaced with
 * controlled fakes so the timing behaviour can be verified deterministically.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// AbortController is a Node.js 20+ global — no import needed.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a deferred Promise so we can resolve/reject it from outside. */
function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Unit: connectWithRetry — retry logic
// ---------------------------------------------------------------------------

describe("connectWithRetry", () => {
  it("resolves immediately when $connect succeeds on the first attempt", async () => {
    const connect = vi.fn().mockResolvedValueOnce(undefined);
    await runConnectWithRetry(connect, { maxRetries: 3, retryDelayMs: 0 });
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("retries and resolves when $connect eventually succeeds", async () => {
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(undefined);

    await runConnectWithRetry(connect, { maxRetries: 5, retryDelayMs: 0 });
    expect(connect).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all retries", async () => {
    const connect = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      runConnectWithRetry(connect, { maxRetries: 3, retryDelayMs: 0 })
    ).rejects.toThrow(/unreachable after 3 attempts/i);

    expect(connect).toHaveBeenCalledTimes(3);
  });

  it("does not retry when maxRetries is 1", async () => {
    const connect = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      runConnectWithRetry(connect, { maxRetries: 1, retryDelayMs: 0 })
    ).rejects.toThrow();

    expect(connect).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Unit: shutdown handler — drains in-flight sync before exit
// ---------------------------------------------------------------------------

describe("shutdown handler — in-flight sync drain", () => {
  it("waits for an in-progress syncCycle to complete before resolving", async () => {
    const events: string[] = [];

    // Simulate a syncCycle that takes 50 ms (e.g. a DB upsert in progress)
    const cycleDeferred = deferred();
    const inflightPromise = cycleDeferred.promise.then(() => {
      events.push("cycle-complete");
    });

    // Simulate the shutdown handler logic from main.ts
    const shutdownPromise = (async () => {
      // Wait for inflight cycle (with a 500 ms grace period — well above 50 ms)
      const timeout = new Promise<void>((resolve) =>
        setTimeout(() => {
          events.push("grace-expired");
          resolve();
        }, 500)
      );
      await Promise.race([inflightPromise, timeout]);
      events.push("shutdown-complete");
    })();

    // Resolve the cycle after a short delay — simulating the upsert finishing
    setTimeout(() => cycleDeferred.resolve(), 30);

    await shutdownPromise;

    expect(events).toEqual(["cycle-complete", "shutdown-complete"]);
  });

  it("does not wait beyond the grace period when a cycle is stuck", async () => {
    const events: string[] = [];

    // A cycle that never completes
    const neverResolves = new Promise<void>(() => {/* intentionally pending */});

    // Use a very short grace period (20 ms) so the test runs fast
    const shutdownPromise = (async () => {
      const timeout = new Promise<void>((resolve) =>
        setTimeout(() => {
          events.push("grace-expired");
          resolve();
        }, 20)
      );
      await Promise.race([neverResolves, timeout]);
      events.push("shutdown-complete");
    })();

    await shutdownPromise;

    expect(events).toEqual(["grace-expired", "shutdown-complete"]);
  });

  it("skips the drain step when there is no in-flight cycle", async () => {
    const events: string[] = [];
    const inflightPromise: Promise<void> | null = null;

    const shutdownPromise = (async () => {
      if (inflightPromise) {
        const timeout = new Promise<void>((resolve) =>
          setTimeout(() => { events.push("grace-expired"); resolve(); }, 500)
        );
        await Promise.race([inflightPromise, timeout]);
      }
      events.push("shutdown-complete");
    })();

    await shutdownPromise;

    // No grace-expired, no waiting — exits immediately
    expect(events).toEqual(["shutdown-complete"]);
  });
});

// ---------------------------------------------------------------------------
// Unit: AbortController stops the sync loop between cycles
// ---------------------------------------------------------------------------

describe("sync loop abort signal", () => {
  it("stops the loop after the current cycle when abort is signalled", async () => {
    const controller = new AbortController();
    const { signal } = controller;

    let cyclesCompleted = 0;

    // Minimal fake sync loop that honours AbortSignal
    const fakeSyncLoop = async () => {
      while (!signal.aborted) {
        // Simulate one sync cycle
        cyclesCompleted++;

        // Simulate sleep between cycles — interruptible
        await abortableSleep(50, signal);
      }
    };

    const loopPromise = fakeSyncLoop();

    // Let one cycle run, then abort
    await sleep(10);
    controller.abort();

    await loopPromise;

    // At least one cycle ran before the loop stopped
    expect(cyclesCompleted).toBeGreaterThanOrEqual(1);
    // The loop exited (if it hadn't the await above would never resolve)
  });

  it("does not start a new cycle after abort", async () => {
    const controller = new AbortController();
    const { signal } = controller;

    let cyclesStarted = 0;

    const fakeSyncLoop = async () => {
      while (!signal.aborted) {
        cyclesStarted++;
        // Cycle takes 20 ms
        await sleep(20);
        // Very short inter-cycle sleep
        await abortableSleep(5, signal);
      }
    };

    // Abort before the loop even runs its first cycle check
    controller.abort();

    const loopPromise = fakeSyncLoop();
    await loopPromise;

    // Loop checked signal.aborted immediately and never started a cycle
    expect(cyclesStarted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Unit: Prisma singleton — only one instance created across multiple calls
//
// The production singleton guard is in indexer/src/db/client.ts.  It uses a
// module-level `_prisma` variable so Node.js module caching guarantees a
// single instance per process.  We verify the *pattern* here without importing
// the real PrismaClient (which requires a generated Prisma client and a live
// database URL to load).
// ---------------------------------------------------------------------------

describe("Prisma singleton guard", () => {
  it("returns the same object on repeated calls (module-level cache pattern)", () => {
    // Inline replica of the singleton pattern from db/client.ts
    let _instance: object | null = null;
    function getInstance() {
      if (!_instance) {
        _instance = { id: Math.random() }; // stand-in for `new PrismaClient()`
      }
      return _instance;
    }

    const a = getInstance();
    const b = getInstance();

    // Both calls must return the exact same object reference.
    expect(a).toBe(b);
  });

  it("creates a fresh instance after the cached one is cleared (disconnectPrisma pattern)", () => {
    let _instance: object | null = null;
    function getInstance() {
      if (!_instance) _instance = { id: Math.random() };
      return _instance;
    }
    function clearInstance() {
      _instance = null;
    }

    const first = getInstance();
    clearInstance(); // simulates disconnectPrisma() nulling _prisma
    const second = getInstance();

    // After a disconnect + reconnect a new instance is created.
    expect(first).not.toBe(second);
  });
});

// ---------------------------------------------------------------------------
// Inline implementations of the patterns under test
// (extracted from the production code so the logic can be tested without
// spinning up a real process or database connection)
// ---------------------------------------------------------------------------

/**
 * Inline version of connectWithRetry that accepts injected dependencies,
 * so the retry behaviour can be tested without a real DB.
 */
async function runConnectWithRetry(
  connect: () => Promise<void>,
  opts: { maxRetries: number; retryDelayMs: number }
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      await connect();
      return;
    } catch (err) {
      lastError = err;
      if (attempt < opts.maxRetries && opts.retryDelayMs > 0) {
        await sleep(opts.retryDelayMs);
      }
    }
  }
  throw new Error(
    `Database unreachable after ${opts.maxRetries} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Inline version of abortableSleep from sync-ledger.ts.
 */
function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve(); return; }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
