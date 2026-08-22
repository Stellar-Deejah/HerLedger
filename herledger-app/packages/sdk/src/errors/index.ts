// ---------------------------------------------------------------------------
// Typed application errors
// ---------------------------------------------------------------------------

/**
 * Thrown by the Freighter wallet adapter when the extension is unavailable,
 * access is denied, or signing fails.
 *
 * @example
 * ```ts
 * try { await connectWallet(); } catch (err) {
 *   if (err instanceof WalletError) console.error(err.message);
 * }
 * ```
 */
export class WalletError extends Error {
  readonly kind = "WalletError" as const;
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "WalletError";
  }
}

/**
 * Known machine-readable error codes emitted by `RpcError`. Consumers can
 * branch on `error.code` without string-matching the human-readable message.
 */
export type RpcErrorCode =
  | "SIMULATION_FAILED"
  | "SUBMIT_FAILED"
  | "TRY_AGAIN_LATER_TIMEOUT"
  | "POLL_FAILED"
  | "POLL_TIMEOUT"
  | "ABORTED";

export class RpcError extends Error {
  readonly kind = "RpcError" as const;
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly code?: RpcErrorCode | string
  ) {
    super(message);
    this.name = "RpcError";
  }
}

/**
 * Thrown when a contract call is rejected on-chain or a decoded value does
 * not match the expected contract shape.
 *
 * @example
 * ```ts
 * try { await getBusiness(id, config, contracts); } catch (err) {
 *   if (err instanceof ContractError) console.error(err.contractCode);
 * }
 * ```
 */
export class ContractError extends Error {
  readonly kind = "ContractError" as const;
  constructor(
    message: string,
    public readonly contractCode?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ContractError";
  }
}

/**
 * Thrown when an input value fails validation (e.g. a malformed or
 * mismatched contract address).
 *
 * @example
 * ```ts
 * try { toContractAddress("BusinessRegistry", bad, "testnet", registry); }
 * catch (err) { if (err instanceof ValidationError) console.error(err.message); }
 * ```
 */
export class ValidationError extends Error {
  readonly kind = "ValidationError" as const;
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Thrown for application-authentication failures. Note that wallet signing
 * is separate from application auth — this class is reserved for the latter.
 *
 * @example
 * ```ts
 * if (!session) throw new AuthenticationError("Not signed in");
 * ```
 */
export class AuthenticationError extends Error {
  readonly kind = "AuthenticationError" as const;
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export type AppError =
  WalletError | RpcError | ContractError | ValidationError | AuthenticationError;
