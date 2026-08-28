import {
  rpc as StellarRpc,
  Transaction,
  FeeBumpTransaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { StellarNetworkConfig, TransactionResult } from "../types/index.js";
import { RpcError, RpcErrorCode, ContractError, ContractErrorCode } from "../errors/index.js";
import { getSorobanRpcServer } from "./client.js";
import { signTransactionWithFreighter } from "../wallet/freighter.js";
import { withRpcTimeout, type RpcCallOptions } from "./timeout.js";

export type { RpcCallOptions } from "./timeout.js";

// ---------------------------------------------------------------------------
// Transaction lifecycle helpers: simulate, prepare, submit, and poll.
//
// The submission path implements the reliability guidance from the Stellar
// docs (https://developers.stellar.org/docs/build/guides/basics/submit-transaction):
//   - `TRY_AGAIN_LATER` is retried with exponential back-off instead of being
//     surfaced as a hard failure or polled at a fixed rate.
//   - a rejected `tx_insufficient_fee` transaction can be recovered via a
//     fee-bump envelope (`submitWithFeeBump`).
// ---------------------------------------------------------------------------

const BASE_BACKOFF_MS = 1_000; // 1s
const MAX_BACKOFF_MS = 8_000; // 8s cap on the exponential schedule
const DEFAULT_MAX_WAIT_MS = 60_000; // 60s default total wait budget
const DEFAULT_POLL_INTERVAL_MS = 2_000; // ~ one Stellar ledger close

/** Progress information delivered to `SubmitAndWaitOptions.onRetry`. */
export interface RetryInfo {
  /** 1-based retry counter (the first retry is attempt 1). */
  attempt: number;
  /** How long the caller will sleep before the next attempt, in ms. */
  delayMs: number;
  /** The RPC status that triggered the retry (e.g. `"TRY_AGAIN_LATER"`). */
  status: string;
}

/** Options that tune `submitAndWait` / `submitWithFeeBump` without changing their required signature. */
export interface SubmitAndWaitOptions {
  /**
   * Total wall-clock budget for submission + confirmation, in milliseconds.
   * Defaults to 60_000 (60s).
   */
  maxWaitMs?: number;
  /**
   * Interval between confirmation polls once the transaction is accepted.
   * Defaults to 2_000 (2s), roughly one Stellar ledger close.
   */
  pollIntervalMs?: number;
  /**
   * Invoked on every `TRY_AGAIN_LATER` retry so callers can surface progress
   * (e.g. "network busy, retrying…").
   */
  onRetry?: (info: RetryInfo) => void;
  /**
   * When provided and aborted, in-flight sleeps reject and polling stops with
   * an `RpcError` whose `code` is `"ABORTED"`.
   */
  signal?: AbortSignal;
  /**
   * Bounds the initial submission RPC call (not the confirmation poll loop,
   * which can legitimately take longer). Defaults to 30s. A timed-out or
   * aborted submission throws `RpcError` with `code: "TIMEOUT"`.
   */
  timeoutMs?: number;
}

/**
 * Simulate a transaction and return the prepared transaction with
 * the resource footprint and fee populated from the simulation result.
 *
 * @param tx - The unsigned transaction to simulate.
 * @param config - Stellar network configuration.
 * @returns A `Transaction` assembled from the simulation result, ready to sign.
 * @throws {RpcError} with `code === "SIMULATION_FAILED"` when the RPC returns a
 *   simulation error result (e.g. a contract invocation failed, or contract
 *   state changed between simulation and submission). The error `cause` holds
 *   the simulation error detail.
 *
 * @example
 * ```ts
 * const prepared = await simulateAndPrepare(tx, config);
 * const signed = await signTransactionWithFreighter(prepared.toXDR(), config.networkPassphrase);
 * ```
 * @param options Optional `{ signal, timeoutMs }`. Defaults to a 30s
 * deadline; a timed-out or aborted call throws `RpcError` with
 * `code: "TIMEOUT"`.
 * @throws {ContractError} with `code === "SIMULATION_ERROR"` when the RPC
 *   returns a simulation error result (e.g. a contract invocation failed, or
 *   contract state changed between simulation and submission).
 */
export async function simulateAndPrepare(
  tx: Transaction,
  config: StellarNetworkConfig,
  options?: RpcCallOptions
): Promise<Transaction> {
  const server = getSorobanRpcServer(config);
  let simResult: StellarRpc.Api.SimulateTransactionResponse;
  try {
    simResult = await withRpcTimeout(server.simulateTransaction(tx), options);
  } catch (cause) {
    if (cause instanceof RpcError) throw cause;
    throw new RpcError(RpcErrorCode.REQUEST_FAILED, "Transaction simulation failed", { cause });
  }

  // Validate the simulation result before preparing: a simulation that errored
  // (e.g. the contract rejected the call, or state changed since the last
  // ledger) must not be silently assembled and submitted as if it succeeded.
  if (StellarRpc.Api.isSimulationError(simResult)) {
    throw new ContractError(
      ContractErrorCode.SIMULATION_ERROR,
      `Simulation error: ${simResult.error}`,
      { context: { contractCode: simResult.error } }
    );
  }

  const prepared = StellarRpc.assembleTransaction(tx, simResult).build();
  return prepared as unknown as Transaction;
}

/**
 * Submit a signed transaction XDR and poll until confirmed or failed.
 *
 * `TRY_AGAIN_LATER` responses from the RPC (network congestion) are retried
 * with exponential back-off of 1s, 2s, 4s, 8s (capped at 8s) until the total
 * wait budget (`options.maxWaitMs`, default 60s) is exhausted.
 *
 * @param signedXdr - Base64-encoded signed transaction envelope.
 * @param config - Stellar network configuration.
 * @param options - Optional tuning for wait budget, poll cadence, retry
 *   notifications, and cancellation. Defaults preserve the original behaviour.
 * @returns The confirmed transaction hash, success flag, and ledger sequence.
 * @throws {ContractError} when the transaction is rejected or fails on-chain.
 * @throws {RpcError} with `code === "TRY_AGAIN_LATER_TIMEOUT"` if the network
 *   stays congested past the wait budget, or `code === "POLL_TIMEOUT"` if the
 *   transaction does not confirm in time.
 *
 * @example
 * ```ts
 * const result = await submitAndWait(signedXdr, config, {
 *   maxWaitMs: 90_000,
 *   onRetry: ({ attempt, delayMs, status }) => {
 *     console.log(`retrying (${status}) attempt ${attempt} in ${delayMs}ms`);
 *   },
 * });
 * ```
 * Poll a submitted transaction hash until it confirms, fails, or the
 * polling budget is exhausted. Split out from `submitAndWait` so a caller
 * that persisted a hash before an earlier poll was interrupted (e.g. a
 * browser tab closed mid-`submitAndWait`) can resume polling that same
 * hash on its own, without resubmitting or re-signing the transaction.
 *
 * @param options Optional `{ signal, maxWaitMs, pollIntervalMs }`. The poll
 * loop is not itself bounded by `timeoutMs` (on-chain confirmation can
 * legitimately take longer than a single RPC call's deadline), but an
 * aborted `signal` is checked between polls and stops polling early,
 * throwing `RpcError` with `code: "ABORTED"`.
 */
export async function pollTransactionStatus(
  hash: string,
  config: StellarNetworkConfig,
  options?: SubmitAndWaitOptions
): Promise<TransactionResult> {
  assertNotAborted(options?.signal);
  const server = getSorobanRpcServer(config);
  const maxWaitMs = options?.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPolls = Math.max(1, Math.ceil(maxWaitMs / Math.max(1, pollIntervalMs)));

  for (let i = 0; i < maxPolls; i++) {
    assertNotAborted(options?.signal);
    await sleep(pollIntervalMs);
    assertNotAborted(options?.signal);
    let getResult: StellarRpc.Api.GetTransactionResponse;
    try {
      getResult = await server.getTransaction(hash);
    } catch (cause) {
      throw new RpcError(RpcErrorCode.REQUEST_FAILED, `Failed to poll transaction ${hash}`, {
        context: { hash },
        cause,
      });
    }

    if (getResult.status === StellarRpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, success: true, ledger: getResult.ledger };
    }
    if (getResult.status === StellarRpc.Api.GetTransactionStatus.FAILED) {
      throw new ContractError(
        ContractErrorCode.ON_CHAIN_FAILURE,
        `Transaction ${hash} failed on-chain`,
        { context: { contractCode: getResult.status } }
      );
    }
    // NOT_FOUND = still pending, keep polling
  }

  throw new RpcError(
    RpcErrorCode.TRANSACTION_NOT_CONFIRMED,
    `Transaction ${hash} did not confirm within timeout`,
    { context: { hash, timeoutMs: maxWaitMs } }
  );
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new RpcError(RpcErrorCode.ABORTED, "Transaction submission was aborted", {
      cause: signal.reason,
    });
  }
}

/**
 * Submit a signed transaction XDR and poll until confirmed or failed.
 *
 * `onSubmitted`, when given as a function, fires with the transaction hash
 * right after the network accepts the submission but before polling starts
 * -- the earliest point a caller can durably persist "this transaction is
 * in flight" (e.g. to localStorage) so a resumed session can pick up
 * polling via `pollTransactionStatus` instead of losing track of an
 * on-chain submission that outlived the page that made it. The third
 * argument may instead be a `SubmitAndWaitOptions` object directly, when
 * no `onSubmitted` callback is needed.
 *
 * @param options `{ signal, timeoutMs, maxWaitMs, pollIntervalMs, onRetry }`.
 * `timeoutMs` (default 30s) bounds the initial submission call; a timed-out
 * or aborted submission throws `RpcError` with `code: "TIMEOUT"`. The same
 * options are forwarded to the confirmation poll loop (see
 * `pollTransactionStatus`).
 */
export async function submitAndWait(
  signedXdr: string,
  config: StellarNetworkConfig,
  optionsOrOnSubmitted?: ((hash: string) => void) | SubmitAndWaitOptions,
  maybeOptions?: SubmitAndWaitOptions
): Promise<TransactionResult> {
  const onSubmitted = typeof optionsOrOnSubmitted === "function" ? optionsOrOnSubmitted : undefined;
  const options = (typeof optionsOrOnSubmitted === "object" && optionsOrOnSubmitted !== null ? optionsOrOnSubmitted : {}) as SubmitAndWaitOptions;
  const onSubmitted =
    typeof optionsOrOnSubmitted === "function" ? optionsOrOnSubmitted : undefined;
  const options =
    typeof optionsOrOnSubmitted === "object" && optionsOrOnSubmitted !== null
      ? optionsOrOnSubmitted
      : maybeOptions;

  assertNotAborted(options?.signal);
  const server = getSorobanRpcServer(config);
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  // Parse the XDR back into a transaction object for submission.
  const txObj = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

  const deadline = Date.now() + maxWaitMs;

  const sendResult = await submitWithRetries(server, txObj, deadline, options);
  onSubmitted?.(sendResult.hash);
  let sendResult: StellarRpc.Api.SendTransactionResponse;
  try {
    sendResult = await withRpcTimeout(server.sendTransaction(txObj), options);
  } catch (cause) {
    if (cause instanceof RpcError) throw cause;
    throw new RpcError(RpcErrorCode.REQUEST_FAILED, "Failed to submit transaction", { cause });
  }

  if (sendResult.status === "ERROR") {
    const detail = sendResult.errorResult?.toXDR("base64") ?? "unknown";
    throw new ContractError(
      ContractErrorCode.SUBMISSION_ERROR,
      `Transaction submission error: ${detail}`,
      { context: { contractCode: sendResult.status } }
    );
  }

  return pollUntilResolved(server, sendResult.hash, deadline, pollIntervalMs, options);
}

/**
 * Wrap a transaction in a fee-bump envelope and resubmit it.
 *
 * This is the standard recovery path for a transaction that was rejected with
 * `tx_insufficient_fee` during network congestion: the inner transaction is
 * unchanged (same source, sequence number, and signatures), while a separate
 * `feeSource` account pays a higher fee to get it included.
 *
 * The fee-bump envelope is signed by `feeSource` via Freighter before being
 * submitted through `submitAndWait` (so it inherits `TRY_AGAIN_LATER` back-off
 * and the `onRetry`/`signal` options).
 *
 * @param innerTx - The prepared, signed inner transaction to bump. This is
 *   typically the same transaction that just failed with `tx_insufficient_fee`.
 * @param feeSource - The Stellar address that pays the bumped fee and signs the
 *   fee-bump envelope. May differ from the inner transaction's source account.
 * @param maxFee - The maximum total fee the `feeSource` is willing to pay, in
 *   stroops. Must be at least the inner transaction's fee (the Stellar docs
 *   recommend `>= 10x` the original fee).
 * @param config - Stellar network configuration.
 * @param options - Forwarded to `submitAndWait`.
 * @returns The confirmed transaction hash, success flag, and ledger sequence.
 * @throws {RpcError} / {ContractError} from `submitAndWait`.
 *
 * @example
 * ```ts
 * try {
 *   await submitAndWait(signedXdr, config);
 * } catch (err) {
 *   if (isInsufficientFee(err)) {
 *     const innerTx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
 *     const result = await submitWithFeeBump(innerTx, feeSource, "10000000", config);
 *   }
 * }
 * ```
 */
export async function submitWithFeeBump(
  innerTx: Transaction,
  feeSource: string,
  maxFee: string,
  config: StellarNetworkConfig,
  options: SubmitAndWaitOptions = {}
): Promise<TransactionResult> {
  const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    feeSource,
    maxFee,
    innerTx,
    config.networkPassphrase
  );

  const signedXdr = await signTransactionWithFreighter(
    feeBumpTx.toXDR(),
    config.networkPassphrase,
    feeSource
  );

  return submitAndWait(signedXdr, config, options);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Exponential back-off schedule: 1s, 2s, 4s, 8s, then capped at 8s. */
function backoffDelayMs(attempt: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

async function submitWithRetries(
  server: StellarRpc.Server,
  txObj: Transaction | FeeBumpTransaction,
  deadline: number,
  options: SubmitAndWaitOptions
): Promise<StellarRpc.Api.SendTransactionResponse> {
  let attempt = 0;

  while (true) {
    assertNotAborted(options.signal);

    let sendResult: StellarRpc.Api.SendTransactionResponse;
    try {
      sendResult = await server.sendTransaction(txObj);
    } catch (cause) {
      throw new RpcError("Failed to submit transaction", cause, "SUBMIT_FAILED");
    }

    // PENDING and DUPLICATE are both "accepted" — hand off to the poller.
    if (sendResult.status !== "TRY_AGAIN_LATER") {
      return sendResult;
    }

    attempt += 1;
    const delayMs = backoffDelayMs(attempt);
    options.onRetry?.({ attempt, delayMs, status: sendResult.status });

    if (Date.now() + delayMs > deadline) {
      throw new RpcError(
        `Transaction submission did not leave TRY_AGAIN_LATER within ` +
          `${options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS}ms`,
        undefined,
        "TRY_AGAIN_LATER_TIMEOUT"
      );
    }

    await sleep(delayMs, options.signal);
  }
}

async function pollUntilResolved(
  server: StellarRpc.Server,
  hash: string,
  deadline: number,
  pollIntervalMs: number,
  options: SubmitAndWaitOptions
): Promise<TransactionResult> {
  while (true) {
    assertNotAborted(options.signal);

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new RpcError(
        `Transaction ${hash} did not confirm within timeout`,
        undefined,
        "POLL_TIMEOUT"
      );
    }

    await sleep(Math.min(pollIntervalMs, remaining), options.signal);

    let getResult: StellarRpc.Api.GetTransactionResponse;
    try {
      getResult = await server.getTransaction(hash);
    } catch (cause) {
      throw new RpcError(`Failed to poll transaction ${hash}`, cause, "POLL_FAILED");
    }

    if (getResult.status === StellarRpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, success: true, ledger: getResult.ledger };
    }
    if (getResult.status === StellarRpc.Api.GetTransactionStatus.FAILED) {
      throw new ContractError(`Transaction ${hash} failed on-chain`, getResult.status);
    }
    // NOT_FOUND (and any future congestion status) = still pending; keep polling
    // until the deadline. The deadline above guarantees termination.
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new RpcError("Transaction submission was aborted", signal.reason, "ABORTED");
  }
}

export async function pollTransactionStatus(
  hash: string,
  config: StellarNetworkConfig,
  options: SubmitAndWaitOptions = {}
): Promise<TransactionResult> {
  const server = getSorobanRpcServer(config);
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const deadline = Date.now() + maxWaitMs;
  return pollUntilResolved(server, hash, deadline, pollIntervalMs, options);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const activeSignal = signal;

    if (activeSignal?.aborted) {
      reject(new RpcError("Transaction submission was aborted", activeSignal.reason, "ABORTED"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(
        new RpcError("Transaction submission was aborted", activeSignal?.reason, "ABORTED")
      );
    };

    const timer = setTimeout(() => {
      activeSignal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    activeSignal?.addEventListener("abort", onAbort, { once: true });
  });
}
