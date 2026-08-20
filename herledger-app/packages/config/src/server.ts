import "server-only";
import { serverEnvSchema, formatZodError, type ServerEnv } from "./schema.js";

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = formatZodError(result.error);
    console.error(`\n[HerLedger] ❌ Missing or invalid server environment variables:\n`);
    console.table(issues);
    console.error(`\nSee .env.example for required configuration.\n`);
    process.exit(1);
  }
  return result.data;
}

export interface StellarNetworkConfig {
  network: "testnet" | "mainnet";
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
}

export interface ContractConfig {
  businessRegistryId: string;
  financialLedgerId: string;
  attestationRegistryId: string;
}

export function getStellarNetworkConfig(): StellarNetworkConfig {
  const env = getServerEnv();
  // Prefer STELLAR_RPC_URLS (comma-separated list); fall back to the
  // deprecated single STELLAR_RPC_URL for backward compatibility.
  const rpcUrl = env.STELLAR_RPC_URLS ?? env.STELLAR_RPC_URL ?? "";
  return {
    network: env.STELLAR_NETWORK,
    rpcUrl,
    horizonUrl: env.STELLAR_HORIZON_URL,
    networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
  };
}

export function getContractConfig(): ContractConfig {
  const env = getServerEnv();
  return {
    businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
    financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
    attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
  };
}

const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export function validateNetworkConsistency(
  network: "testnet" | "mainnet",
  rpcUrl: string,
  passphrase: string
): void {
  const expectedPassphrase = network === "mainnet" ? MAINNET_PASSPHRASE : TESTNET_PASSPHRASE;

  if (passphrase !== expectedPassphrase) {
    throw new Error(
      `[HerLedger] Network consistency check failed: STELLAR_NETWORK is "${network}" but STELLAR_NETWORK_PASSPHRASE does not match the expected ${network} passphrase. Expected: "${expectedPassphrase}", got: "${passphrase}".`
    );
  }

  const rpcLooksTestnet = /testnet/i.test(rpcUrl);
  const rpcLooksMainnet = /mainnet/i.test(rpcUrl);

  if (network === "mainnet" && rpcLooksTestnet) {
    throw new Error(
      `[HerLedger] Network consistency check failed: STELLAR_NETWORK is "mainnet" but STELLAR_RPC_URL ("${rpcUrl}") looks like a testnet URL.`
    );
  }

  if (network === "testnet" && rpcLooksMainnet) {
    throw new Error(
      `[HerLedger] Network consistency check failed: STELLAR_NETWORK is "testnet" but STELLAR_RPC_URL ("${rpcUrl}") looks like a mainnet URL.`
    );
  }
}
