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
} from "./registry.js";
export type {
  ContractName,
  ContractAddressRegistry,
  ContractAddressRegistryEntry,
} from "./registry.js";

// Generated ABI types
export * from "./__generated__/index.js";

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
} from "./encoding.js";

// BusinessRegistry client
export {
  getBusiness,
  getBusinessByWallet,
  registerBusiness,
  updateBusinessMetadata,
  deactivateBusiness,
} from "./business-registry.js";

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
} from "./financial-ledger.js";

// AttestationRegistry client
export {
  getAttestation,
  isValidAttestation,
  registerAttester,
  deactivateAttester,
  createAttestation,
  revokeAttestation,
} from "./attestation-registry.js";

// Attester display-name registry (pure, hand-maintained map)
export { KNOWN_ATTESTERS, resolveAttesterName } from "../attester-registry.js";
export type { AttesterRegistry, AttesterRegistryEntry } from "../attester-registry.js";
