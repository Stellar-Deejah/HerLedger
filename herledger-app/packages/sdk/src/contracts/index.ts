// ---------------------------------------------------------------------------
// `@herledger/sdk/contracts` — contract clients, XDR encoding, and the
// generated ABI type surface. Importing from here pulls in none of the wallet
// adapter or RPC lifecycle code, so bundlers can drop it from client bundles.
// ---------------------------------------------------------------------------

// Contract address registry
export {
  CONTRACT_NAMES,
  createContractAddressRegistry,
  registerCurrentNetworkAddresses,
  toContractAddress,
  buildContractConfig,
} from "./registry";
export type {
  ContractName,
  ContractAddressRegistry,
  ContractAddressRegistryEntry,
} from "./registry";

// Generated ABI types
export * from "./__generated__/index";

// XDR encoding/decoding
export {
  encodeBytes32,
  encodeAddress,
  encodeI128,
  encodeBool,
  encodeU32,
  decodeBytes32,
  decodeAddress,
  decodeI128,
  decodeU64,
  decodeBool,
  hexToBytes,
} from "./encoding";

// BusinessRegistry client
export {
  getBusiness,
  getBusinessByWallet,
  registerBusiness,
  updateBusinessMetadata,
  deactivateBusiness,
} from "./business-registry";

// FinancialLedger client
export {
  getFinancialEvent,
  getBusinessEvents,
  isSupportedAsset,
  recordFinancialEvent,
  disputeFinancialEvent,
  verifyFinancialEvent,
  resolveFinancialEvent,
  revokeFinancialEvent,
} from "./financial-ledger";

// AttestationRegistry client
export {
  getAttestation,
  isValidAttestation,
  registerAttester,
  deactivateAttester,
  createAttestation,
  revokeAttestation,
} from "./attestation-registry";

// Attester display-name registry (pure, hand-maintained map)
export { KNOWN_ATTESTERS, resolveAttesterName } from "../attester-registry";
export type { AttesterRegistry, AttesterRegistryEntry } from "../attester-registry";
