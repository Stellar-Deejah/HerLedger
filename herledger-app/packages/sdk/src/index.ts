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
} from "./types/index";
export type { ApiResponse, ApiError, ApiMeta, ApiErrorResponse } from "./types/api";
export * from "./types/index";

// Attester registry
export { KNOWN_ATTESTERS, resolveAttesterName } from "./attester-registry";
export type { AttesterRegistry, AttesterRegistryEntry } from "./attester-registry";

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
} from "./errors/index";
export type {
  AppError,
  AppErrorCode,
  AppErrorOptions,
  WalletErrorContext,
  RpcErrorContext,
  ContractErrorContext,
  ValidationErrorContext,
  AuthenticationErrorContext,
} from "./errors/index";

// Query cache
export {
  QueryCache,
  defaultQueryCache,
  clearQueryCache,
  buildCacheKey,
  DEFAULT_QUERY_CACHE_TTL_MS,
} from "./cache/query-cache";
export type { QueryCacheOptions } from "./cache/query-cache";

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
} from "./rpc/client";
export type { RpcHealthResult } from "./rpc/client";
export { CircuitBreaker } from "./rpc/circuit-breaker";
export type { CircuitState, CircuitBreakerOptions } from "./rpc/circuit-breaker";
export { simulateAndPrepare, submitAndWait, pollTransactionStatus } from "./rpc/transactions";
export { DEFAULT_RPC_TIMEOUT_MS } from "./rpc/timeout";
export type { RpcCallOptions } from "./rpc/timeout";

// Wallet — interface + Freighter adapter
export type { WalletProvider, WalletConnection } from "./wallet/types";
export {
  FreighterWalletProvider,
  freighterWalletProvider,
  // Backward-compatible functional API (deprecated — use useWallet() hook)
  isFreighterAvailable,
  connectWallet,
  getConnectedAddress,
  signTransactionWithFreighter,
} from "./wallet/freighter";

// Wallet ownership challenge (re-linking)
export {
  WALLET_LINK_CHALLENGE_TTL_MS,
  generateWalletLinkNonce,
  buildWalletLinkChallengeMessage,
  isWalletLinkChallengeExpired,
  signWalletLinkChallenge,
  verifyWalletLinkChallengeSignature,
} from "./wallet/challenge";
export type { WalletLinkChallengeParams } from "./wallet/challenge";

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
} from "./contracts/encoding";

// Contract address registry
export {
  CONTRACT_NAMES,
  createContractAddressRegistry,
  registerCurrentNetworkAddresses,
  toContractAddress,
  buildContractConfig,
} from "./contracts/registry";
export type {
  ContractName,
  ContractAddressRegistry,
  ContractAddressRegistryEntry,
} from "./contracts/registry";

// Contracts (clients, encoding, registry, generated ABI types)
export * from "./contracts/index";
