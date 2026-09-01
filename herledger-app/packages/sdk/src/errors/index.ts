// ---------------------------------------------------------------------------
// Typed application errors
//
// Every error class carries a `code` from that class's own enum plus an
// optional, class-specific typed `context` payload. Callers can discriminate
// on `error.code` in a `switch` statement (see `AppErrorCode` /
// `assertUnreachable` below) instead of matching on `error.message` strings,
// which are for humans and may change without notice.
// ---------------------------------------------------------------------------

/** Options accepted by every `AppError` subclass constructor. */
export interface AppErrorOptions<TContext> {
  /** Structured, class-specific data about what failed. */
  context?: TContext;
  /** The underlying error/value that caused this one, if any. */
  cause?: unknown;
}

/**
 * Common base for all SDK error classes. Not exported directly — use the
 * concrete subclasses (`WalletError`, `RpcError`, etc.) so `instanceof`
 * checks and `error.code` stay narrowed to that class's own code union.
 */
abstract class AppErrorBase<TCode extends string, TContext = undefined> extends Error {
  abstract readonly kind: string;
  readonly code: TCode;
  readonly context: TContext | undefined;
  override readonly cause: unknown;

  constructor(code: TCode, message: string, options?: AppErrorOptions<TContext>) {
    super(message);
    this.code = code;
    this.context = options?.context;
    this.cause = options?.cause;
  }
}

// ---------------------------------------------------------------------------
// WalletError — Freighter / wallet-adapter failures
// ---------------------------------------------------------------------------

export const WalletErrorCode = {
  /** The Freighter browser extension is not installed or not detected. */
  NOT_INSTALLED: "NOT_INSTALLED",
  /** The user rejected (or Freighter denied) the access request. */
  ACCESS_DENIED: "ACCESS_DENIED",
  /** The user rejected the transaction-signing prompt. */
  SIGNING_REJECTED: "SIGNING_REJECTED",
  /** Freighter did not return a usable wallet address. */
  ADDRESS_UNAVAILABLE: "ADDRESS_UNAVAILABLE",
  /** Freighter did not return network info, or a signed XDR was missing. */
  UNAVAILABLE: "UNAVAILABLE",
  /** Unclassified wallet failure (unexpected exception from the extension). */
  UNKNOWN: "UNKNOWN",
} as const;
export type WalletErrorCode = (typeof WalletErrorCode)[keyof typeof WalletErrorCode];

export interface WalletErrorContext {
  /** Raw error string reported by the Freighter API, if any. */
  reason?: string;
}

export class WalletError extends AppErrorBase<WalletErrorCode, WalletErrorContext> {
  readonly kind = "WalletError" as const;
  constructor(
    code: WalletErrorCode,
    message: string,
    options?: AppErrorOptions<WalletErrorContext>
  ) {
    super(code, message, options);
    this.name = "WalletError";
  }
}

// ---------------------------------------------------------------------------
// RpcError — Soroban RPC transport / infrastructure failures
// ---------------------------------------------------------------------------

export const RpcErrorCode = {
  /** The underlying RPC request threw (network error, non-2xx, bad payload). */
  REQUEST_FAILED: "REQUEST_FAILED",
  /** The call did not complete before its deadline (`timeoutMs` or an aborted `AbortSignal`). */
  TIMEOUT: "TIMEOUT",
  /** Every configured RPC endpoint has an open circuit breaker. */
  ALL_ENDPOINTS_UNAVAILABLE: "ALL_ENDPOINTS_UNAVAILABLE",
  /** No RPC URLs were configured at all. */
  NO_ENDPOINTS_CONFIGURED: "NO_ENDPOINTS_CONFIGURED",
  /** A submitted transaction never reached SUCCESS/FAILED within the poll budget. */
  TRANSACTION_NOT_CONFIRMED: "TRANSACTION_NOT_CONFIRMED",
  /** `simulateTransaction` returned a simulation error. */
  SIMULATION_FAILED: "SIMULATION_FAILED",
  /** Submitting the signed transaction was rejected by the network. */
  SUBMIT_FAILED: "SUBMIT_FAILED",
  /** Polling for the submitted transaction's status threw. */
  POLL_FAILED: "POLL_FAILED",
  /** Polling exhausted its budget without the transaction reaching a final state. */
  POLL_TIMEOUT: "POLL_TIMEOUT",
  /** `submitAndWait` retried `TRY_AGAIN_LATER` until `maxWaitMs` expired. */
  TRY_AGAIN_LATER_TIMEOUT: "TRY_AGAIN_LATER_TIMEOUT",
  /** The call was aborted via `AbortSignal` before it completed. */
  ABORTED: "ABORTED",
} as const;
export type RpcErrorCode = (typeof RpcErrorCode)[keyof typeof RpcErrorCode];

export interface RpcErrorContext {
  /** The RPC endpoint URL involved, if known. */
  endpoint?: string;
  /** The timeout budget (ms) that was in effect. */
  timeoutMs?: number;
  /** The transaction hash involved, if known. */
  hash?: string;
}

export class RpcError extends AppErrorBase<RpcErrorCode, RpcErrorContext> {
  readonly kind = "RpcError" as const;
  constructor(code: RpcErrorCode, message: string, options?: AppErrorOptions<RpcErrorContext>) {
    super(code, message, options);
    this.name = "RpcError";
  }
}

// ---------------------------------------------------------------------------
// ContractError — Soroban contract / simulation-level failures
// ---------------------------------------------------------------------------

export const ContractErrorCode = {
  /** `simulateTransaction` returned a simulation error. */
  SIMULATION_ERROR: "SIMULATION_ERROR",
  /** Submitting the signed transaction was rejected by the network. */
  SUBMISSION_ERROR: "SUBMISSION_ERROR",
  /** The transaction was confirmed but failed on-chain. */
  ON_CHAIN_FAILURE: "ON_CHAIN_FAILURE",
  /** A returned ScVal did not decode into the expected shape. */
  DECODE_ERROR: "DECODE_ERROR",
  /** An input value could not be encoded into a valid ScVal. */
  ENCODE_ERROR: "ENCODE_ERROR",
  /** An enum/union variant returned by the contract was not recognized. */
  UNKNOWN_VARIANT: "UNKNOWN_VARIANT",
} as const;
export type ContractErrorCode = (typeof ContractErrorCode)[keyof typeof ContractErrorCode];

export interface ContractErrorContext {
  /** Raw contract/simulation error code or diagnostic string, if any. */
  contractCode?: string;
  /** The contract method being called, if known. */
  method?: string;
}

export class ContractError extends AppErrorBase<ContractErrorCode, ContractErrorContext> {
  readonly kind = "ContractError" as const;
  constructor(
    code: ContractErrorCode,
    message: string,
    options?: AppErrorOptions<ContractErrorContext>
  ) {
    super(code, message, options);
    this.name = "ContractError";
  }
}

// ---------------------------------------------------------------------------
// ValidationError — caller-supplied input failed validation
// ---------------------------------------------------------------------------

export const ValidationErrorCode = {
  /** A value does not have the expected shape/format (e.g. not StrKey-encoded). */
  MALFORMED_INPUT: "MALFORMED_INPUT",
  /** A contract address has no registered entry for the target network. */
  ADDRESS_NOT_REGISTERED: "ADDRESS_NOT_REGISTERED",
  /** A supplied address does not match the registered/expected value. */
  ADDRESS_MISMATCH: "ADDRESS_MISMATCH",
} as const;
export type ValidationErrorCode = (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode];

export interface ValidationErrorContext {
  /** Name of the field/value that failed validation. */
  field?: string;
  /** The value that was rejected (stringified — never assume it's safe to log as-is upstream). */
  value?: string;
}

export class ValidationError extends AppErrorBase<ValidationErrorCode, ValidationErrorContext> {
  readonly kind = "ValidationError" as const;
  constructor(
    code: ValidationErrorCode,
    message: string,
    options?: AppErrorOptions<ValidationErrorContext>
  ) {
    super(code, message, options);
    this.name = "ValidationError";
  }
}

// ---------------------------------------------------------------------------
// AuthenticationError — reserved for callers layering auth on top of the SDK
// ---------------------------------------------------------------------------

export const AuthenticationErrorCode = {
  /** No authenticated session/identity is present. */
  UNAUTHENTICATED: "UNAUTHENTICATED",
  /** The authenticated identity is not permitted to perform the action. */
  FORBIDDEN: "FORBIDDEN",
  /** The session/credential has expired. */
  SESSION_EXPIRED: "SESSION_EXPIRED",
} as const;
export type AuthenticationErrorCode =
  (typeof AuthenticationErrorCode)[keyof typeof AuthenticationErrorCode];

export interface AuthenticationErrorContext {
  /** Identifier of the principal that failed to authenticate/authorize, if known. */
  principal?: string;
}

export class AuthenticationError extends AppErrorBase<
  AuthenticationErrorCode,
  AuthenticationErrorContext
> {
  readonly kind = "AuthenticationError" as const;
  constructor(
    code: AuthenticationErrorCode,
    message: string,
    options?: AppErrorOptions<AuthenticationErrorContext>
  ) {
    super(code, message, options);
    this.name = "AuthenticationError";
  }
}

// ---------------------------------------------------------------------------
// Union type + exhaustiveness helper
// ---------------------------------------------------------------------------

export type AppError =
  | WalletError
  | RpcError
  | ContractError
  | ValidationError
  | AuthenticationError;

/** Union of every `code` value across every `AppError` subclass. */
export type AppErrorCode =
  | WalletErrorCode
  | RpcErrorCode
  | ContractErrorCode
  | ValidationErrorCode
  | AuthenticationErrorCode;

/**
 * Type-level exhaustiveness check: call this in the `default` branch of a
 * `switch (error.code)` so TypeScript refuses to compile if a case is
 * missing. At runtime it throws (a code should never reach here).
 */
export function assertUnreachable(value: never): never {
  throw new Error(`Unreachable case: ${JSON.stringify(value)}`);
}
