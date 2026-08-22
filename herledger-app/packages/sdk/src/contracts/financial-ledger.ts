import {
  Contract,
  TransactionBuilder,
  Account,
  xdr,
  rpc as StellarRpc,
} from "@stellar/stellar-sdk";
import type {
  FinancialEvent,
  EventType,
  EventStatus,
  StellarNetworkConfig,
  ContractConfig,
  TransactionResult,
} from "../types/index.js";
import { RpcError, ContractError } from "../errors/index.js";
import { getSorobanRpcServer } from "../rpc/client.js";
import { simulateAndPrepare, submitAndWait } from "../rpc/transactions.js";
import { signTransactionWithFreighter } from "../wallet/freighter.js";
import {
  encodeBytes32,
  encodeAddress,
  encodeI128,
  encodeU32,
  encodeBool,
  decodeBytes32,
  decodeAddress,
  decodeI128,
  decodeU64,
  toHexString32,
} from "./encoding.js";

// ---------------------------------------------------------------------------
// FinancialLedger contract client
// ---------------------------------------------------------------------------

const READ_ACCOUNT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

function isVoid(val: xdr.ScVal): boolean {
  return val.switch().name === "scvVoid";
}

function decodeEventType(val: xdr.ScVal): EventType {
  const name = val.value()?.toString() ?? "";
  const map: Record<string, EventType> = {
    PaymentReceived: "PaymentReceived",
    PaymentSent: "PaymentSent",
    InvoiceSettled: "InvoiceSettled",
    CommitmentFulfilled: "CommitmentFulfilled",
  };
  const result = map[name];
  if (!result) throw new ContractError(`Unknown EventType: ${name}`);
  return result;
}

function decodeEventStatus(val: xdr.ScVal): EventStatus {
  const name = val.value()?.toString() ?? "";
  const map: Record<string, EventStatus> = {
    Pending: "Pending",
    Verified: "Verified",
    Disputed: "Disputed",
    Revoked: "Revoked",
  };
  const result = map[name];
  if (!result) throw new ContractError(`Unknown EventStatus: ${name}`);
  return result;
}

function decodeFinancialEvent(val: xdr.ScVal): FinancialEvent {
  const map = val.map();
  if (!map) throw new ContractError("Expected struct map for FinancialEvent");

  const fields: Record<string, xdr.ScVal> = {};
  for (const entry of map) {
    fields[entry.key().sym().toString()] = entry.val();
  }

  return {
    id: decodeBytes32(fields["id"]!),
    businessId: decodeBytes32(fields["business_id"]!),
    eventType: decodeEventType(fields["event_type"]!),
    asset: decodeAddress(fields["asset"]!),
    amount: decodeI128(fields["amount"]!),
    stellarReference: decodeBytes32(fields["stellar_reference"]!),
    metadataHash: decodeBytes32(fields["metadata_hash"]!),
    status: decodeEventStatus(fields["status"]!),
    createdAt: decodeU64(fields["created_at"]!),
  };
}

async function simulateRead(
  tx: ReturnType<TransactionBuilder["build"]>,
  config: StellarNetworkConfig
): Promise<StellarRpc.Api.SimulateTransactionResponse> {
  const server = getSorobanRpcServer(config);
  try {
    return await server.simulateTransaction(tx);
  } catch (cause) {
    throw new RpcError("Contract simulation failed", cause);
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Read `get_event(event_id)` from the FinancialLedger contract.
 *
 * @param eventId - Hex-encoded on-chain event ID (32 bytes).
 * @param config - Stellar network configuration.
 * @param contracts - Validated contract addresses.
 * @returns The `FinancialEvent`, or `null` if none exists for the ID.
 * @throws {RpcError} if simulation fails; {ContractError} on a simulation error.
 *
 * @example
 * ```ts
 * const event = await getFinancialEvent(id, config, contracts);
 * ```
 */
export async function getFinancialEvent(
  eventId: string,
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<FinancialEvent | null> {
  const contract = new Contract(contracts.financialLedgerId);
  const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call("get_event", encodeBytes32(toHexString32(eventId))))
    .setTimeout(30)
    .build();

  const sim = await simulateRead(tx, config);
  if (StellarRpc.Api.isSimulationError(sim)) {
    throw new ContractError(`get_event error: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  if (!retval || isVoid(retval)) return null;
  return decodeFinancialEvent(retval);
}

/**
 * Read a page of `get_business_events(business_id, offset, limit)` from the
 * FinancialLedger contract.
 *
 * @param businessId - Hex-encoded on-chain business ID (32 bytes).
 * @param offset - Zero-based page offset.
 * @param limit - Maximum number of events to return.
 * @param config - Stellar network configuration.
 * @param contracts - Validated contract addresses.
 * @returns The events for the page (empty array if none).
 * @throws {RpcError} if simulation fails; {ContractError} on a simulation error.
 *
 * @example
 * ```ts
 * const events = await getBusinessEvents(id, 0, 20, config, contracts);
 * ```
 */
export async function getBusinessEvents(
  businessId: string,
  offset: number,
  limit: number,
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<FinancialEvent[]> {
  const contract = new Contract(contracts.financialLedgerId);
  const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "get_business_events",
        encodeBytes32(toHexString32(businessId)),
        encodeU32(offset),
        encodeU32(limit)
      )
    )
    .setTimeout(30)
    .build();

  const sim = await simulateRead(tx, config);
  if (StellarRpc.Api.isSimulationError(sim)) {
    throw new ContractError(`get_business_events error: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  if (!retval || isVoid(retval)) return [];

  const vec = retval.vec();
  if (!vec) return [];
  return vec.map(decodeFinancialEvent);
}

/**
 * Read `is_supported_asset(asset)` from the FinancialLedger contract.
 *
 * @param assetAddress - Stellar asset contract address to check.
 * @param config - Stellar network configuration.
 * @param contracts - Validated contract addresses.
 * @returns `true` if the asset is supported for indexing.
 * @throws {RpcError} if simulation fails; {ContractError} on a simulation error.
 *
 * @example
 * ```ts
 * const supported = await isSupportedAsset(asset, config, contracts);
 * ```
 */
export async function isSupportedAsset(
  assetAddress: string,
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<boolean> {
  const contract = new Contract(contracts.financialLedgerId);
  const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call("is_supported_asset", encodeAddress(assetAddress)))
    .setTimeout(30)
    .build();

  const sim = await simulateRead(tx, config);
  if (StellarRpc.Api.isSimulationError(sim)) {
    throw new ContractError(`is_supported_asset error: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  if (!retval || isVoid(retval)) return false;
  return retval.b();
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Write `record_event(...)` to create a financial event on-chain, signing
 * with the `submitter` account via Freighter.
 *
 * @param params - Event fields plus the `sourceAccount` used to build the
 *   transaction.
 * @param config - Stellar network configuration.
 * @param contracts - Validated contract addresses.
 * @returns The confirmed transaction result.
 * @throws {RpcError} / {ContractError} / {WalletError} on failure.
 *
 * @example
 * ```ts
 * const result = await recordFinancialEvent(
 *   { eventId, businessId, eventType, asset, amount, stellarReference, metadataHash, submitter, sourceAccount },
 *   config,
 *   contracts
 * );
 * ```
 */
export async function recordFinancialEvent(
  params: {
    eventId: string;
    businessId: string;
    eventType: EventType;
    asset: string;
    amount: bigint;
    stellarReference: string;
    metadataHash: string;
    submitter: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<TransactionResult> {
  const contract = new Contract(contracts.financialLedgerId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "record_event",
        encodeBytes32(toHexString32(params.eventId)),
        encodeBytes32(toHexString32(params.businessId)),
        xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(params.eventType)]),
        encodeAddress(params.asset),
        encodeI128(params.amount),
        encodeBytes32(toHexString32(params.stellarReference)),
        encodeBytes32(toHexString32(params.metadataHash))
      )
    )
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signedXdr = await signTransactionWithFreighter(
    prepared.toXDR(),
    config.networkPassphrase,
    params.submitter
  );
  return submitAndWait(signedXdr, config);
}

/**
 * Write `dispute_event(event_id, business_owner, reason_hash)`, signing with
 * the `owner` account via Freighter.
 *
 * NOTE: the contract requires `business_owner: Address` as an explicit
 * argument (it calls `business_owner.require_auth()` directly rather than
 * loading the owner from storage) — a prior version of this function
 * omitted it, which would have failed at the RPC layer with an argument
 * count mismatch. Fixed as part of #59's ABI audit.
 *
 * @param params - Dispute fields (event ID, owner, reason hash) plus the
 *   `sourceAccount` used to build the transaction.
 * @param config - Stellar network configuration.
 * @param contracts - Validated contract addresses.
 * @returns The confirmed transaction result.
 * @throws {RpcError} / {ContractError} / {WalletError} on failure.
 *
 * @example
 * ```ts
 * const result = await disputeFinancialEvent(
 *   { eventId, reasonHash, owner, sourceAccount },
 *   config,
 *   contracts
 * );
 * ```
 */
export async function disputeFinancialEvent(
  params: {
    eventId: string;
    reasonHash: string;
    owner: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<TransactionResult> {
  const contract = new Contract(contracts.financialLedgerId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "dispute_event",
        encodeBytes32(toHexString32(params.eventId)),
        encodeAddress(params.owner),
        encodeBytes32(toHexString32(params.reasonHash))
      )
    )
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signedXdr = await signTransactionWithFreighter(
    prepared.toXDR(),
    config.networkPassphrase,
    params.owner
  );
  return submitAndWait(signedXdr, config);
}

/**
 * Write `verify_event(event_id)`, signing with the `submitter` account via
 * Freighter.
 *
 * @param params - Verification fields plus the `sourceAccount`.
 * @param config - Stellar network configuration.
 * @param contracts - Validated contract addresses.
 * @returns The confirmed transaction result.
 * @throws {RpcError} / {ContractError} / {WalletError} on failure.
 *
 * @example
 * ```ts
 * const result = await verifyFinancialEvent(
 *   { eventId, submitter, sourceAccount },
 *   config,
 *   contracts
 * );
 * ```
 */
export async function verifyFinancialEvent(
  params: {
    eventId: string;
    submitter: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<TransactionResult> {
  const contract = new Contract(contracts.financialLedgerId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call("verify_event", encodeBytes32(toHexString32(params.eventId))))
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signedXdr = await signTransactionWithFreighter(
    prepared.toXDR(),
    config.networkPassphrase,
    params.submitter
  );
  return submitAndWait(signedXdr, config);
}

/**
 * Write `resolve_dispute(event_id, valid, resolution_hash)`, signing with the
 * `submitter` account via Freighter.
 *
 * @param params - Resolution fields plus the `sourceAccount`.
 * @param config - Stellar network configuration.
 * @param contracts - Validated contract addresses.
 * @returns The confirmed transaction result.
 * @throws {RpcError} / {ContractError} / {WalletError} on failure.
 *
 * @example
 * ```ts
 * const result = await resolveFinancialEvent(
 *   { eventId, valid, resolutionHash, submitter, sourceAccount },
 *   config,
 *   contracts
 * );
 * ```
 */
export async function resolveFinancialEvent(
  params: {
    eventId: string;
    valid: boolean;
    resolutionHash: string;
    submitter: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<TransactionResult> {
  const contract = new Contract(contracts.financialLedgerId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "resolve_dispute",
        encodeBytes32(toHexString32(params.eventId)),
        encodeBool(params.valid),
        encodeBytes32(toHexString32(params.resolutionHash))
      )
    )
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signedXdr = await signTransactionWithFreighter(
    prepared.toXDR(),
    config.networkPassphrase,
    params.submitter
  );
  return submitAndWait(signedXdr, config);
}

/**
 * Write `revoke_event(event_id, reason_hash)`, signing with the `submitter`
 * account via Freighter.
 *
 * @param params - Revocation fields plus the `sourceAccount`.
 * @param config - Stellar network configuration.
 * @param contracts - Validated contract addresses.
 * @returns The confirmed transaction result.
 * @throws {RpcError} / {ContractError} / {WalletError} on failure.
 *
 * @example
 * ```ts
 * const result = await revokeFinancialEvent(
 *   { eventId, reasonHash, submitter, sourceAccount },
 *   config,
 *   contracts
 * );
 * ```
 */
export async function revokeFinancialEvent(
  params: {
    eventId: string;
    reasonHash: string;
    submitter: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<TransactionResult> {
  const contract = new Contract(contracts.financialLedgerId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call("revoke_event", encodeBytes32(toHexString32(params.eventId)), encodeBytes32(toHexString32(params.reasonHash)))
    )
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signedXdr = await signTransactionWithFreighter(
    prepared.toXDR(),
    config.networkPassphrase,
    params.submitter
  );
  return submitAndWait(signedXdr, config);
}
