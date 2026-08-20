import {
  Contract,
  TransactionBuilder,
  Account,
  xdr,
  rpc as StellarRpc,
} from "@stellar/stellar-sdk";
import type {
  Business,
  StellarNetworkConfig,
  ContractConfig,
  TransactionResult,
  TransactionSigner,
} from "../types/index.js";
import { RpcError, ContractError } from "../errors/index.js";
import { getSorobanRpcServer } from "../rpc/client.js";
import { simulateAndPrepare, submitAndWait } from "../rpc/transactions.js";
import { signTransactionWithFreighter } from "../wallet/freighter.js";
import {
  encodeBytes32,
  encodeAddress,
  decodeBytes32,
  decodeAddress,
  decodeBool,
  toHexString32,
} from "./encoding.js";

// ---------------------------------------------------------------------------
// BusinessRegistry contract client
// ---------------------------------------------------------------------------

/** Placeholder account used for read-only simulations (no auth, no fees). */
const READ_ACCOUNT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

function isVoid(val: xdr.ScVal): boolean {
  return val.switch().name === "scvVoid";
}

function decodeBusiness(val: xdr.ScVal): Business {
  const map = val.map();
  if (!map) throw new ContractError("Expected struct map for Business");

  const fields: Record<string, xdr.ScVal> = {};
  for (const entry of map) {
    fields[entry.key().sym().toString()] = entry.val();
  }

  return {
    id: decodeBytes32(fields["id"]!),
    owner: decodeAddress(fields["owner"]!),
    wallet: decodeAddress(fields["wallet"]!),
    metadataHash: decodeBytes32(fields["metadata_hash"]!),
    active: decodeBool(fields["active"]!),
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
 * Read: get_business(business_id) -> Option<Business>
 */
export async function getBusiness(
  businessId: string,
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<Business | null> {
  const contract = new Contract(contracts.businessRegistryId);
  const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call("get_business", encodeBytes32(toHexString32(businessId))))
    .setTimeout(30)
    .build();

  const sim = await simulateRead(tx, config);
  if (StellarRpc.Api.isSimulationError(sim)) {
    throw new ContractError(`get_business error: ${sim.error}`);
  }

  const retval = sim.result?.retval;
  if (!retval || isVoid(retval)) return null;
  return decodeBusiness(retval);
}

/**
 * Read: get_business_by_wallet(wallet) -> Option<Business>
 */
export async function getBusinessByWallet(
  wallet: string,
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<Business | null> {
  const contract = new Contract(contracts.businessRegistryId);
  const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call("get_business_by_wallet", encodeAddress(wallet)))
    .setTimeout(30)
    .build();

  const sim = await simulateRead(tx, config);
  if (StellarRpc.Api.isSimulationError(sim)) {
    throw new ContractError(`get_business_by_wallet error: ${sim.error}`);
  }

  const retval = sim.result?.retval;
  if (!retval || isVoid(retval)) return null;
  return decodeBusiness(retval);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Write: register_business(business_id, owner, wallet, metadata_hash)
 *
 * `onSubmitted`, when given, fires with the transaction hash as soon as the
 * network accepts the submission -- see `submitAndWait` in
 * `../rpc/transactions.js` for why this is the seam a caller uses to
 * persist "registration in flight" state ahead of on-chain confirmation.
 */
export async function registerBusiness(
  params: {
    businessId: string;
    owner: string;
    wallet: string;
    metadataHash: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig,
  signer?: TransactionSigner,
  onSubmitted?: (hash: string) => void
): Promise<TransactionResult> {
  const contract = new Contract(contracts.businessRegistryId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "register_business",
        encodeBytes32(toHexString32(params.businessId)),
        encodeAddress(params.owner),
        encodeAddress(params.wallet),
        encodeBytes32(toHexString32(params.metadataHash))
      )
    )
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signFn = signer?.signTransaction ?? signTransactionWithFreighter;
  const signedXdr = await signFn(
    prepared.toXDR(),
    config.networkPassphrase,
    params.owner
  );
  return submitAndWait(signedXdr, config, onSubmitted);
}

/**
 * Write: update_metadata(business_id, metadata_hash)
 */
export async function updateBusinessMetadata(
  params: {
    businessId: string;
    metadataHash: string;
    owner: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig,
  signer?: TransactionSigner
): Promise<TransactionResult> {
  const contract = new Contract(contracts.businessRegistryId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "update_metadata",
        encodeBytes32(toHexString32(params.businessId)),
        encodeBytes32(toHexString32(params.metadataHash))
      )
    )
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signFn = signer?.signTransaction ?? signTransactionWithFreighter;
  const signedXdr = await signFn(
    prepared.toXDR(),
    config.networkPassphrase,
    params.owner
  );
  return submitAndWait(signedXdr, config);
}

/**
 * Write: deactivate_business(business_id)
 */
export async function deactivateBusiness(
  params: {
    businessId: string;
    owner: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig,
  signer?: TransactionSigner
): Promise<TransactionResult> {
  const contract = new Contract(contracts.businessRegistryId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call("deactivate_business", encodeBytes32(toHexString32(params.businessId))))
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signFn = signer?.signTransaction ?? signTransactionWithFreighter;
  const signedXdr = await signFn(
    prepared.toXDR(),
    config.networkPassphrase,
    params.owner
  );
  return submitAndWait(signedXdr, config);
}
