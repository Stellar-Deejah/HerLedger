import {
  getStellarNetworkConfig,
  getContractConfig as getRawContractConfig,
} from "@herledger/config/server";
import {
  registerCurrentNetworkAddresses,
  buildContractConfig,
  type ContractConfig,
  type StellarNetworkConfig,
} from "@herledger/sdk";

// ---------------------------------------------------------------------------
// Server-only Stellar network + contract config, for API routes that need to
// make on-chain RPC calls (e.g. re-validating an attestation server-side).
// Mirrors indexer/src/jobs/sync-ledger.ts's construction — do not import
// this from client components, it reads server-only env vars.
// ---------------------------------------------------------------------------
export function getServerStellarConfig(): StellarNetworkConfig {
  return getStellarNetworkConfig();
}

export function getServerContractConfig(): ContractConfig {
  const stellarConfig = getStellarNetworkConfig();
  const rawContractConfig = getRawContractConfig();
  const registry = registerCurrentNetworkAddresses(stellarConfig.network, rawContractConfig);
  return buildContractConfig(registry, stellarConfig.network, rawContractConfig);
}
