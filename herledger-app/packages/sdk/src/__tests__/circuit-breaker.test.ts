import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker } from "../rpc/circuit-breaker.js";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- Construction -------------------------------------------------------

  it("starts in CLOSED state with zero failures", () => {
    const cb = new CircuitBreaker();
    expect(cb.state).toBe("CLOSED");
    expect(cb.failureCount).toBe(0);
  });

  it("uses custom options when provided", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 10_000 });
    expect(cb.options.failureThreshold).toBe(3);
    expect(cb.options.resetTimeoutMs).toBe(10_000);
  });

  it("uses defaults when no options are provided", () => {
    const cb = new CircuitBreaker();
    expect(cb.options.failureThreshold).toBe(5);
    expect(cb.options.resetTimeoutMs).toBe(30_000);
  });

  // ---- CLOSED state -------------------------------------------------------

  it("allows requests when CLOSED", () => {
    const cb = new CircuitBreaker();
    expect(cb.allowRequest()).toBe(true);
  });

  it("stays CLOSED when failures are below the threshold", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.onFailure();
    cb.onFailure();
    expect(cb.state).toBe("CLOSED");
    expect(cb.failureCount).toBe(2);
    expect(cb.allowRequest()).toBe(true);
  });

  // ---- CLOSED → OPEN transition -------------------------------------------

  it("transitions from CLOSED to OPEN after reaching the failure threshold", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.onFailure();
    cb.onFailure();
    cb.onFailure();
    expect(cb.state).toBe("OPEN");
    expect(cb.failureCount).toBe(3);
  });

  it("rejects requests when OPEN", () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.onFailure();
    expect(cb.state).toBe("OPEN");
    expect(cb.allowRequest()).toBe(false);
  });

  // ---- OPEN → HALF_OPEN transition ----------------------------------------

  it("transitions from OPEN to HALF_OPEN after the reset timeout elapses", () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 5_000,
    });

    cb.onFailure();
    expect(cb.state).toBe("OPEN");

    // Advance time by just under the timeout — should still be OPEN.
    vi.advanceTimersByTime(4_999);
    expect(cb.state).toBe("OPEN");

    // Advance past the timeout — should transition to HALF_OPEN.
    vi.advanceTimersByTime(1);
    expect(cb.state).toBe("HALF_OPEN");
  });

  it("allows one probe request when HALF_OPEN", () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1_000,
    });

    cb.onFailure();
    vi.advanceTimersByTime(1_000);
    expect(cb.state).toBe("HALF_OPEN");
    expect(cb.allowRequest()).toBe(true);
  });

  // ---- HALF_OPEN → CLOSED transition (success) ----------------------------

  it("transitions from HALF_OPEN to CLOSED on success", () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1_000,
    });

    cb.onFailure(); // → OPEN
    vi.advanceTimersByTime(1_000); // → HALF_OPEN
    expect(cb.state).toBe("HALF_OPEN");

    cb.onSuccess(); // → CLOSED
    expect(cb.state).toBe("CLOSED");
    expect(cb.failureCount).toBe(0);
  });

  // ---- HALF_OPEN → OPEN transition (failure) ------------------------------

  it("transitions from HALF_OPEN back to OPEN on failure", () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1_000,
    });

    cb.onFailure(); // → OPEN
    vi.advanceTimersByTime(1_000); // → HALF_OPEN
    expect(cb.state).toBe("HALF_OPEN");

    cb.onFailure(); // → OPEN again
    expect(cb.state).toBe("OPEN");
  });

  // ---- Full cycle: CLOSED → OPEN → HALF_OPEN → CLOSED --------------------

  it("completes a full state cycle", () => {
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 5_000,
    });

    // CLOSED
    expect(cb.state).toBe("CLOSED");

    // Accumulate failures → OPEN
    cb.onFailure();
    expect(cb.state).toBe("CLOSED");
    cb.onFailure();
    expect(cb.state).toBe("OPEN");

    // Wait for reset timeout → HALF_OPEN
    vi.advanceTimersByTime(5_000);
    expect(cb.state).toBe("HALF_OPEN");

    // Successful probe → CLOSED
    cb.onSuccess();
    expect(cb.state).toBe("CLOSED");
    expect(cb.failureCount).toBe(0);
  });

  // ---- reset() ------------------------------------------------------------

  it("reset() forces the breaker back to CLOSED", () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.onFailure();
    expect(cb.state).toBe("OPEN");

    cb.reset();
    expect(cb.state).toBe("CLOSED");
    expect(cb.failureCount).toBe(0);
  });

  // ---- onSuccess() resets failure count in CLOSED state --------------------

  it("onSuccess() resets the failure count when in CLOSED state", () => {
    const cb = new CircuitBreaker({ failureThreshold: 5 });
    cb.onFailure();
    cb.onFailure();
    cb.onFailure();
    expect(cb.failureCount).toBe(3);

    cb.onSuccess();
    expect(cb.failureCount).toBe(0);
    expect(cb.state).toBe("CLOSED");
  });

  // ---- Configurable thresholds --------------------------------------------

  it("respects a custom failure threshold of 10", () => {
    const cb = new CircuitBreaker({ failureThreshold: 10 });
    for (let i = 0; i < 9; i++) cb.onFailure();
    expect(cb.state).toBe("CLOSED");

    cb.onFailure();
    expect(cb.state).toBe("OPEN");
  });

  it("respects a custom reset timeout", () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 60_000,
    });

    cb.onFailure();
    expect(cb.state).toBe("OPEN");

    vi.advanceTimersByTime(59_999);
    expect(cb.state).toBe("OPEN");

    vi.advanceTimersByTime(1);
    expect(cb.state).toBe("HALF_OPEN");
  });
});
