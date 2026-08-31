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
  maxWaitMs?: number;
  pollIntervalMs?: number;
  onRetry?: (info: RetryInfo) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new RpcError(RpcErrorCode.ABORTED, "Transaction submission was aborted", {
      cause: signal.reason,
    });
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new RpcError(RpcErrorCode.ABORTED, "Transaction submission was aborted", {
          cause: signal.reason,
        })
      );
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(
        new RpcError(RpcErrorCode.ABORTED, "Transaction submission was aborted", {
          cause: signal?.reason,
        })
      );
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Simulate a transaction and return the prepared transaction with
 * the resource footprint and fee populated from the simulation result.
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
      { context: { contractCode: String(simResult.error) } }
    );
  }

  const prepared = StellarRpc.assembleTransaction(tx, simResult).build();
  return prepared as unknown as Transaction;
}

/**
 * Exponential back-off schedule: 1s, 2s, 4s, 8s, then capped at 8s.
 */
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
      sendResult = await withRpcTimeout(server.sendTransaction(txObj), options);
    } catch (cause) {
      if (cause instanceof RpcError) throw cause;
      throw new RpcError(RpcErrorCode.REQUEST_FAILED, "Failed to submit transaction", { cause });
    }

    if (sendResult.status !== "TRY_AGAIN_LATER") {
      return sendResult;
    }

    attempt += 1;
    const delayMs = backoffDelayMs(attempt);
    options.onRetry?.({ attempt, delayMs, status: sendResult.status });

    if (Date.now() + delayMs > deadline) {
      throw new RpcError(
        RpcErrorCode.TRY_AGAIN_LATER_TIMEOUT,
        `Transaction submission did not leave TRY_AGAIN_LATER within ${
          options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS
        }ms`
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
        RpcErrorCode.POLL_TIMEOUT,
        `Transaction ${hash} did not confirm within timeout`,
        { context: { hash, timeoutMs: options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS } }
      );
    }

    await sleep(Math.min(pollIntervalMs, remaining), options.signal);

    let getResult: StellarRpc.Api.GetTransactionResponse;
    try {
      getResult = await server.getTransaction(hash);
    } catch (cause) {
      throw new RpcError(RpcErrorCode.POLL_FAILED, `Failed to poll transaction ${hash}`, {
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
        { context: { contractCode: String(getResult.status) } }
      );
    }
  }
}

/**
 * Poll a submitted transaction hash until it confirms, fails, or the polling budget is exhausted.
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
  const deadline = Date.now() + maxWaitMs;
  return pollUntilResolved(server, hash, deadline, pollIntervalMs, options ?? {});
}

/**
 * Submit a signed transaction XDR and poll until confirmed or failed.
 */
export async function submitAndWait(
  signedXdr: string,
  config: StellarNetworkConfig,
  optionsOrOnSubmitted?: ((hash: string) => void) | SubmitAndWaitOptions,
  maybeOptions?: SubmitAndWaitOptions
): Promise<TransactionResult> {
  const onSubmitted = typeof optionsOrOnSubmitted === "function" ? optionsOrOnSubmitted : undefined;
  const options =
    typeof optionsOrOnSubmitted === "object" && optionsOrOnSubmitted !== null
      ? optionsOrOnSubmitted
      : (maybeOptions ?? {});

  assertNotAborted(options.signal);
  const server = getSorobanRpcServer(config);

  const txObj = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
  const deadline = Date.now() + (options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS);

  const sendResult = await submitWithRetries(server, txObj, deadline, options);
  onSubmitted?.(sendResult.hash);

  if (sendResult.status === "ERROR") {
    const detail = sendResult.errorResult?.toXDR("base64") ?? "unknown";
    throw new ContractError(
      ContractErrorCode.SUBMISSION_ERROR,
      `Transaction submission error: ${detail}`,
      { context: { contractCode: String(sendResult.status) } }
    );
  }

  const hash = sendResult.hash;
  onSubmitted?.(hash);

  return pollTransactionStatus(hash, config, options);
}

/**
 * Wrap a transaction in a fee-bump envelope and resubmit it.
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
