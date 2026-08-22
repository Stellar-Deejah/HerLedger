import {
  rpc as StellarRpc,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { StellarNetworkConfig, TransactionResult } from "../types/index.js";
import { RpcError, ContractError } from "../errors/index.js";
import { getSorobanRpcServer } from "./client.js";
import { signTransactionWithFreighter } from "../wallet/freighter.js";

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
}

/**
 * Simulate a transaction and return the prepared transaction with the
 * resource footprint and fee populated from the simulation result.
 *
 * @param tx - The unsigned transaction to simulate.
 * @param config - Stellar network configuration.
 * @returns A `Transaction` assembled from the simulation result, ready to sign.
 * @throws {RpcError} with `code === "SIMULATION_FAILED"` when the RPC returns a
 *   simulation error result (e.g. a contract invocation failed, or contract
 *   state changed between simulation and submission). The error `cause` holds
 *   the simulation error detail.
 */
export async function simulateAndPrepare(
  tx: Transaction,
  config: StellarNetworkConfig
): Promise<Transaction> {
  const server = getSorobanRpcServer(config);
  let simResult: StellarRpc.Api.SimulateTransactionResponse;
  try {
    simResult = await server.simulateTransaction(tx);
  } catch (cause) {
    throw new RpcError("Transaction simulation failed", cause, "SIMULATION_FAILED");
  }

  if (StellarRpc.Api.isSimulationError(simResult)) {
    throw new RpcError(
      `Transaction simulation failed: ${simResult.error}`,
      simResult.error,
      "SIMULATION_FAILED"
    );
  }

  const prepared = StellarRpc.assembleTransaction(tx, simResult).build();
  return prepared as unknown as Transaction;
}

/**
 * Poll a submitted transaction hash until it confirms, fails, or the
 * polling budget is exhausted.
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
      throw new RpcError(`Failed to poll transaction ${hash}`, cause, "POLL_FAILED");
    }

    if (getResult.status === StellarRpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, success: true, ledger: getResult.ledger };
    }
    if (getResult.status === StellarRpc.Api.GetTransactionStatus.FAILED) {
      throw new ContractError(`Transaction ${hash} failed on-chain`, getResult.status);
    }
  }

  throw new RpcError(
    `Timed out waiting for transaction ${hash} after ${maxWaitMs}ms`,
    undefined,
    "TIMEOUT"
  );
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new RpcError("Transaction submission was aborted", signal.reason, "ABORTED");
  }
}

/**
 * Submit a signed transaction XDR and poll until confirmed or failed.
 *
 * `onSubmitted`, when given as a function or via options object, handles options.
 */
export async function submitAndWait(
  signedXdr: string,
  config: StellarNetworkConfig,
  optionsOrOnSubmitted?: ((hash: string) => void) | SubmitAndWaitOptions
): Promise<TransactionResult> {
  const onSubmitted = typeof optionsOrOnSubmitted === "function" ? optionsOrOnSubmitted : undefined;
  const options = typeof optionsOrOnSubmitted === "object" && optionsOrOnSubmitted !== null ? optionsOrOnSubmitted : undefined;

  assertNotAborted(options?.signal);
  const server = getSorobanRpcServer(config);

  const txObj = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

  let sendResult: StellarRpc.Api.SendTransactionResponse;
  try {
    sendResult = await server.sendTransaction(txObj);
  } catch (cause) {
    throw new RpcError("Failed to submit transaction", cause);
  }

  if (sendResult.status === "ERROR") {
    const detail = sendResult.errorResult?.toXDR("base64") ?? "unknown";
    throw new ContractError(`Transaction submission error: ${detail}`, sendResult.status);
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
