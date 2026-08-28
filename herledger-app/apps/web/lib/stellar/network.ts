import { getPublicEnv } from "@herledger/config";
import { registerCurrentNetworkAddresses, buildContractConfig } from "@herledger/sdk/contracts";
import type { ContractConfig, NetworkId, StellarNetworkConfig } from "@herledger/sdk/types";
import { Networks } from "@stellar/stellar-sdk";

export function getNetworkPassphrase(): string {
  const env = getPublicEnv();
  return env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

/**
 * Browser-safe `StellarNetworkConfig`, built from `NEXT_PUBLIC_*` env vars.
 * `horizonUrl` is empty — it's only needed server-side (indexer), never for
 * client-initiated writes, which only need `rpcUrl` for simulation/submit.
 */
export function getStellarConfig(): StellarNetworkConfig {
  const env = getPublicEnv();
  return {
    network: env.NEXT_PUBLIC_STELLAR_NETWORK,
    rpcUrl: env.NEXT_PUBLIC_STELLAR_RPC_URL,
    horizonUrl: "",
    networkPassphrase: getNetworkPassphrase(),
  };
}

/**
 * Browser-safe `ContractConfig`, built from `NEXT_PUBLIC_*_CONTRACT_ID`.
 *
 * This is the single source of truth for client-side contract address
 * construction — components should import this rather than each defining
 * their own local `getContractConfig()` (previously duplicated in
 * `business-registration-form.tsx` and `dispute-form.tsx`).
 *
 * Its fields are the branded `ContractAddress` type rather than raw
 * `string` — see packages/sdk/src/types/branded.ts. `registerCurrentNetworkAddresses`
 * registers each address under whichever network `NEXT_PUBLIC_STELLAR_NETWORK`
 * is actually set to (there's only one set of `*_CONTRACT_ID` vars — no
 * separate mainnet vars yet — so this must not hardcode "testnet").
 *
 * Throws `ValidationError` if a configured address is malformed — surfacing
 * a misconfigured env var at startup instead of at first contract call.
 */
export function getContractConfig(): ContractConfig {
  const env = getPublicEnv();
  const network: NetworkId = env.NEXT_PUBLIC_STELLAR_NETWORK;

  const registry = registerCurrentNetworkAddresses(network, {
    businessRegistryId: env.NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID,
    financialLedgerId: env.NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID,
    attestationRegistryId: env.NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID,
  });

  return buildContractConfig(registry, network, {
    businessRegistryId: env.NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID,
    financialLedgerId: env.NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID,
    attestationRegistryId: env.NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID,
  });
}
