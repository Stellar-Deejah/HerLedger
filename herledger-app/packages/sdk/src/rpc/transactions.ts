import {
  rpc as StellarRpc,
  Transaction,
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
// ---------------------------------------------------------------------------

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
  const onSubmitted =
    typeof optionsOrOnSubmitted === "function" ? optionsOrOnSubmitted : undefined;
  const options =
    typeof optionsOrOnSubmitted === "object" && optionsOrOnSubmitted !== null
      ? optionsOrOnSubmitted
      : maybeOptions;

  assertNotAborted(options?.signal);
  const server = getSorobanRpcServer(config);

  const txObj = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

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

  const hash = sendResult.hash;
  onSubmitted?.(hash);

  return pollTransactionStatus(hash, config, options);
}

/**
 * Wraps an inner transaction in a FeeBumpTransaction signed by `feeSource` and submits it.
 */
export async function submitWithFeeBump(
  innerTx: Transaction,
  feeSource: string,
  fee: string | number,
  config: StellarNetworkConfig,
  options?: SubmitAndWaitOptions
): Promise<TransactionResult> {
  const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    feeSource,
    String(fee),
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
