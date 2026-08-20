// Types
export type {
  Business,
  FinancialEvent,
  EventType,
  EventStatus,
  Attestation,
  AttestationStatus,
  Attester,
  StellarNetworkConfig,
  ContractConfig,
  TransactionResult,
  NetworkId,
  Brand,
  ContractAddress,
  HexString32,
} from "./types/index.js";

// Attester registry
export {
  KNOWN_ATTESTERS,
  resolveAttesterName,
} from "./attester-registry.js";
export type { AttesterRegistry, AttesterRegistryEntry } from "./attester-registry.js";

// Errors
export {
  WalletError,
  RpcError,
  ContractError,
  ValidationError,
  AuthenticationError,
} from "./errors/index.js";
export type { AppError } from "./errors/index.js";

// RPC
export {
  getSorobanRpcServer,
  getLatestLedger,
  checkRpcHealth,
  withRpcFailover,
  configureCircuitBreaker,
  getActiveRpcEndpoint,
  recordRpcSuccess,
  recordRpcFailure,
  resetRpcState,
  parseRpcUrls,
} from "./rpc/client.js";
export type { RpcHealthResult } from "./rpc/client.js";
export { CircuitBreaker } from "./rpc/circuit-breaker.js";
export type {
  CircuitState,
  CircuitBreakerOptions,
} from "./rpc/circuit-breaker.js";
export { simulateAndPrepare, submitAndWait } from "./rpc/transactions.js";

// Wallet
export {
  isFreighterAvailable,
  connectWallet,
  getConnectedAddress,
  signTransactionWithFreighter,
} from "./wallet/freighter.js";

// Encoding
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
} from "./contracts/encoding.js";

// Contract address registry
export {
  CONTRACT_NAMES,
  createContractAddressRegistry,
  registerCurrentNetworkAddresses,
  toContractAddress,
  buildContractConfig,
} from "./contracts/registry.js";
export type {
  ContractName,
  ContractAddressRegistry,
  ContractAddressRegistryEntry,
} from "./contracts/registry.js";

// Generated ABI types
export * from "./contracts/__generated__/index.js";

// BusinessRegistry
export {
  getBusiness,
  getBusinessByWallet,
  registerBusiness,
  updateBusinessMetadata,
  deactivateBusiness,
} from "./contracts/business-registry.js";

// FinancialLedger
export {
  getFinancialEvent,
  getBusinessEvents,
  isSupportedAsset,
  recordFinancialEvent,
  disputeFinancialEvent,
  verifyFinancialEvent,
  resolveFinancialEvent,
  revokeFinancialEvent,
} from "./contracts/financial-ledger.js";

// AttestationRegistry
export {
  getAttestation,
  isValidAttestation,
  registerAttester,
  deactivateAttester,
  createAttestation,
  revokeAttestation,
} from "./contracts/attestation-registry.js";
