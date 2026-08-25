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
  TransactionSigner,
} from "./types/index.js";

// Attester registry
export { KNOWN_ATTESTERS, resolveAttesterName } from "./attester-registry.js";
export type { AttesterRegistry, AttesterRegistryEntry } from "./attester-registry.js";

// Errors
export {
  WalletError,
  WalletErrorCode,
  RpcError,
  RpcErrorCode,
  ContractError,
  ContractErrorCode,
  ValidationError,
  ValidationErrorCode,
  AuthenticationError,
  AuthenticationErrorCode,
  assertUnreachable,
} from "./errors/index.js";
export type {
  AppError,
  AppErrorCode,
  AppErrorOptions,
  WalletErrorContext,
  RpcErrorContext,
  ContractErrorContext,
  ValidationErrorContext,
  AuthenticationErrorContext,
} from "./errors/index.js";

// Query cache
export {
  QueryCache,
  defaultQueryCache,
  clearQueryCache,
  buildCacheKey,
  DEFAULT_QUERY_CACHE_TTL_MS,
} from "./cache/query-cache.js";
export type { QueryCacheOptions } from "./cache/query-cache.js";

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
export type { CircuitState, CircuitBreakerOptions } from "./rpc/circuit-breaker.js";
export { simulateAndPrepare, submitAndWait, pollTransactionStatus } from "./rpc/transactions.js";
export { DEFAULT_RPC_TIMEOUT_MS } from "./rpc/timeout.js";
export type { RpcCallOptions } from "./rpc/timeout.js";

// Wallet
export { WalletAdapter, WalletConnection, WalletAccount } from "./wallet/types.js";
export { FreighterAdapter } from "./wallet/freighter-adapter.js";
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
  toHexString32,
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
