// ---------------------------------------------------------------------------
// `@herledger/sdk` — convenience barrel re-exporting the full public surface.
//
// Prefer the tree-shakeable sub-path entries when you only need one slice:
//   - `@herledger/sdk/contracts` — contract clients, encoding, ABI types
//   - `@herledger/sdk/wallet`    — Freighter adapter
//   - `@herledger/sdk/rpc`       — RPC client + transaction lifecycle
//   - `@herledger/sdk/types`     — shared types
//   - `@herledger/sdk/errors`    — typed error classes
// ---------------------------------------------------------------------------

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
export type { ApiResponse, ApiError, ApiMeta, ApiErrorResponse } from "./types/api.js";
export * from "./types/index.js";

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

// Wallet — interface + Freighter adapter
export type { WalletProvider, WalletConnection } from "./wallet/types.js";
export {
  FreighterWalletProvider,
  freighterWalletProvider,
  // Backward-compatible functional API (deprecated — use useWallet() hook)
  isFreighterAvailable,
  connectWallet,
  getConnectedAddress,
  signTransactionWithFreighter,
} from "./wallet/freighter.js";

// Wallet ownership challenge (re-linking)
export {
  WALLET_LINK_CHALLENGE_TTL_MS,
  generateWalletLinkNonce,
  buildWalletLinkChallengeMessage,
  isWalletLinkChallengeExpired,
  signWalletLinkChallenge,
  verifyWalletLinkChallengeSignature,
} from "./wallet/challenge.js";
export type { WalletLinkChallengeParams } from "./wallet/challenge.js";

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

// Contracts (clients, encoding, registry, generated ABI types)
export * from "./contracts/index.js";
