// ---------------------------------------------------------------------------
// `@herledger/sdk/rpc` — Soroban RPC client factory and the transaction
// lifecycle (simulate → prepare → submit → confirm).
// ---------------------------------------------------------------------------

export { getSorobanRpcServer, getLatestLedger } from "./client";
export { simulateAndPrepare, submitAndWait } from "./transactions";
