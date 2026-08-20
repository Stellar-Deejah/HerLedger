// ---------------------------------------------------------------------------
// Circuit Breaker — protects against cascading failures when an RPC endpoint
// is unreachable. State machine: CLOSED → OPEN → HALF_OPEN → CLOSED.
// ---------------------------------------------------------------------------

/**
 * Circuit breaker states.
 *
 * - `CLOSED`    – requests flow through normally; failures are counted.
 * - `OPEN`      – the circuit is tripped; requests are rejected immediately.
 * - `HALF_OPEN` – one probe request is allowed to test recovery.
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before the circuit opens. @default 5 */
  failureThreshold: number;
  /** Milliseconds to wait in OPEN state before transitioning to HALF_OPEN. @default 30_000 */
  resetTimeoutMs: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
};

export class CircuitBreaker {
  private _state: CircuitState = "CLOSED";
  private _failureCount = 0;
  private _lastFailureTime = 0;
  private _options: CircuitBreakerOptions;

  constructor(options?: Partial<CircuitBreakerOptions>) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ---- Accessors (read-only for external consumers) -----------------------

  get state(): CircuitState {
    // Lazily transition OPEN → HALF_OPEN when the timeout has elapsed.
    if (this._state === "OPEN" && this._hasResetTimeoutElapsed()) {
      this._state = "HALF_OPEN";
    }
    return this._state;
  }

  get failureCount(): number {
    return this._failureCount;
  }

  get options(): Readonly<CircuitBreakerOptions> {
    return this._options;
  }

  // ---- Public API ---------------------------------------------------------

  /**
   * Returns `true` if a request should be allowed through.
   *
   * - `CLOSED`    → always allow
   * - `HALF_OPEN` → allow (one probe)
   * - `OPEN`      → allow only if the reset timeout has elapsed (→ HALF_OPEN)
   */
  allowRequest(): boolean {
    const currentState = this.state; // triggers lazy OPEN → HALF_OPEN
    return currentState !== "OPEN";
  }

  /**
   * Record a successful request. Resets the breaker to CLOSED.
   */
  onSuccess(): void {
    this._failureCount = 0;
    this._state = "CLOSED";
  }

  /**
   * Record a failed request. If the failure threshold is reached the circuit
   * opens and further requests will be rejected immediately until the reset
   * timeout elapses.
   */
  onFailure(): void {
    this._failureCount += 1;
    this._lastFailureTime = Date.now();

    if (this._state === "HALF_OPEN") {
      // The probe request failed — re-open the circuit.
      this._state = "OPEN";
      return;
    }

    if (this._failureCount >= this._options.failureThreshold) {
      this._state = "OPEN";
    }
  }

  /**
   * Force-reset the breaker to CLOSED with zero failures.
   * Useful during testing or when an external signal confirms recovery.
   */
  reset(): void {
    this._state = "CLOSED";
    this._failureCount = 0;
    this._lastFailureTime = 0;
  }

  // ---- Internal -----------------------------------------------------------

  private _hasResetTimeoutElapsed(): boolean {
    return Date.now() - this._lastFailureTime >= this._options.resetTimeoutMs;
  }
}
