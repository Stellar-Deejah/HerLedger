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
export * from "./types/index.js";

// Attester registry
export { KNOWN_ATTESTERS, resolveAttesterName } from "./attester-registry.js";
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
export type { CircuitState, CircuitBreakerOptions } from "./rpc/circuit-breaker.js";
export { simulateAndPrepare, submitAndWait, pollTransactionStatus } from "./rpc/transactions.js";

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
