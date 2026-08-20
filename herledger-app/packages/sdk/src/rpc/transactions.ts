import { rpc as StellarRpc, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import type { StellarNetworkConfig, TransactionResult } from "../types/index.js";
import { RpcError, ContractError } from "../errors/index.js";
import { getSorobanRpcServer } from "./client.js";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

/**
 * Simulate a transaction and return the prepared transaction with
 * the resource footprint and fee populated from the simulation result.
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
    throw new RpcError("Transaction simulation failed", cause);
  }

  if (StellarRpc.Api.isSimulationError(simResult)) {
    throw new ContractError(`Simulation error: ${simResult.error}`, simResult.error);
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
 */
export async function pollTransactionStatus(
  hash: string,
  config: StellarNetworkConfig
): Promise<TransactionResult> {
  const server = getSorobanRpcServer(config);

  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    let getResult: StellarRpc.Api.GetTransactionResponse;
    try {
      getResult = await server.getTransaction(hash);
    } catch (cause) {
      throw new RpcError(`Failed to poll transaction ${hash}`, cause);
    }

    if (getResult.status === StellarRpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, success: true, ledger: getResult.ledger };
    }
    if (getResult.status === StellarRpc.Api.GetTransactionStatus.FAILED) {
      throw new ContractError(`Transaction ${hash} failed on-chain`, getResult.status);
    }
    // NOT_FOUND = still pending, keep polling
  }

  throw new RpcError(`Transaction ${hash} did not confirm within timeout`);
}

/**
 * Submit a signed transaction XDR and poll until confirmed or failed.
 *
 * `onSubmitted`, when given, fires with the transaction hash right after
 * the network accepts the submission but before polling starts -- the
 * earliest point a caller can durably persist "this transaction is in
 * flight" (e.g. to localStorage) so a resumed session can pick up polling
 * via `pollTransactionStatus` instead of losing track of an on-chain
 * submission that outlived the page that made it.
 */
export async function submitAndWait(
  signedXdr: string,
  config: StellarNetworkConfig,
  onSubmitted?: (hash: string) => void
): Promise<TransactionResult> {
  const server = getSorobanRpcServer(config);

  // Parse the XDR back into a transaction object for submission
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

  return pollTransactionStatus(hash, config);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
