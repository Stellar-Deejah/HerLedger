import {
  Contract,
  TransactionBuilder,
  Account,
  xdr,
  rpc as StellarRpc,
} from "@stellar/stellar-sdk";
import type {
  Attestation,
  AttestationStatus,
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
  decodeBytes32,
  decodeAddress,
  decodeU64,
  toHexString32,
} from "./encoding.js";

// ---------------------------------------------------------------------------
// AttestationRegistry contract client
// ---------------------------------------------------------------------------

const READ_ACCOUNT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

function isVoid(val: xdr.ScVal): boolean {
  return val.switch().name === "scvVoid";
}

function decodeAttestationStatus(val: xdr.ScVal): AttestationStatus {
  const name = val.value()?.toString() ?? "";
  if (name === "Active") return "Active";
  if (name === "Revoked") return "Revoked";
  throw new ContractError(`Unknown AttestationStatus: ${name}`);
}

function decodeAttestation(val: xdr.ScVal): Attestation {
  const map = val.map();
  if (!map) throw new ContractError("Expected struct map for Attestation");
  const fields: Record<string, xdr.ScVal> = {};
  for (const entry of map) {
    fields[entry.key().sym().toString()] = entry.val();
  }
  return {
    id: decodeBytes32(fields["id"]!),
    eventId: decodeBytes32(fields["event_id"]!),
    attester: decodeAddress(fields["attester"]!),
    claimHash: decodeBytes32(fields["claim_hash"]!),
    issuedAt: decodeU64(fields["issued_at"]!),
    status: decodeAttestationStatus(fields["status"]!),
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

export async function getAttestation(
  attestationId: string,
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<Attestation | null> {
  const contract = new Contract(contracts.attestationRegistryId);
  const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call("get_attestation", encodeBytes32(toHexString32(attestationId))))
    .setTimeout(30)
    .build();

  const sim = await simulateRead(tx, config);
  if (StellarRpc.Api.isSimulationError(sim)) {
    throw new ContractError(`get_attestation error: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  if (!retval || isVoid(retval)) return null;
  return decodeAttestation(retval);
}

export async function isValidAttestation(
  attestationId: string,
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<boolean> {
  const contract = new Contract(contracts.attestationRegistryId);
  const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call("is_valid_attestation", encodeBytes32(toHexString32(attestationId))))
    .setTimeout(30)
    .build();

  const sim = await simulateRead(tx, config);
  if (StellarRpc.Api.isSimulationError(sim)) {
    throw new ContractError(`is_valid_attestation error: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  if (!retval || isVoid(retval)) return false;
  return retval.b();
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function registerAttester(
  params: {
    attester: string;
    metadataHash: string;
    admin: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<TransactionResult> {
  const contract = new Contract(contracts.attestationRegistryId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "register_attester",
        encodeAddress(params.attester),
        encodeBytes32(toHexString32(params.metadataHash))
      )
    )
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signedXdr = await signTransactionWithFreighter(
    prepared.toXDR(),
    config.networkPassphrase,
    params.admin
  );
  return submitAndWait(signedXdr, config);
}

export async function deactivateAttester(
  params: {
    attester: string;
    admin: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<TransactionResult> {
  const contract = new Contract(contracts.attestationRegistryId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call("deactivate_attester", encodeAddress(params.attester)))
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signedXdr = await signTransactionWithFreighter(
    prepared.toXDR(),
    config.networkPassphrase,
    params.admin
  );
  return submitAndWait(signedXdr, config);
}

/**
 * Write: create_attestation(attestation_id, event_id, attester, claim_hash)
 *
 * NOTE: the contract signature includes `attester: Address` as an explicit
 * positional argument (used for `attester.require_auth()` and the
 * `InvalidAttester` / `InactiveAttester` lookups) — a prior version of this
 * function omitted it from the `.call()` args entirely, sending only 3 of
 * the 4 required arguments. Fixed as part of #59's ABI audit.
 */
export async function createAttestation(
  params: {
    attestationId: string;
    eventId: string;
    claimHash: string;
    attester: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<TransactionResult> {
  const contract = new Contract(contracts.attestationRegistryId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "create_attestation",
        encodeBytes32(toHexString32(params.attestationId)),
        encodeBytes32(toHexString32(params.eventId)),
        encodeAddress(params.attester),
        encodeBytes32(toHexString32(params.claimHash))
      )
    )
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signedXdr = await signTransactionWithFreighter(
    prepared.toXDR(),
    config.networkPassphrase,
    params.attester
  );
  return submitAndWait(signedXdr, config);
}

export async function revokeAttestation(
  params: {
    attestationId: string;
    reasonHash: string;
    attester: string;
    sourceAccount: Account;
  },
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<TransactionResult> {
  const contract = new Contract(contracts.attestationRegistryId);
  const tx = new TransactionBuilder(params.sourceAccount, {
    fee: "1000000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "revoke_attestation",
        encodeBytes32(toHexString32(params.attestationId)),
        encodeBytes32(toHexString32(params.reasonHash))
      )
    )
    .setTimeout(300)
    .build();

  const prepared = await simulateAndPrepare(tx, config);
  const signedXdr = await signTransactionWithFreighter(
    prepared.toXDR(),
    config.networkPassphrase,
    params.attester
  );
  return submitAndWait(signedXdr, config);
}
