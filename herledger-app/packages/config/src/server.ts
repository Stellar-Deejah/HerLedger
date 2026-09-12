import "server-only";
import { serverEnvSchema, formatZodError, type ServerEnv } from "./schema";

const MOCK_CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    if (process.env.SKIP_ENV_VALIDATION === "true" || process.env.SKIP_ENV_VALIDATION === "1") {
      console.warn(`\n[HerLedger] ⚠️ Server environment validation failed, but SKIP_ENV_VALIDATION is enabled. Using build-time defaults.\n`);
      return {
        NODE_ENV:
          process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test"
            ? process.env.NODE_ENV
            : "development",
        APP_URL: process.env.APP_URL || "https://her-ledger.vercel.app",
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock",
        BETTER_AUTH_SECRET:
          process.env.BETTER_AUTH_SECRET ||
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM || "HerLedger <onboarding@resend.dev>",
        STELLAR_NETWORK: process.env.STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet",
        STELLAR_RPC_URLS: process.env.STELLAR_RPC_URLS || "https://soroban-testnet.stellar.org",
        STELLAR_HORIZON_URL: process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org",
        STELLAR_NETWORK_PASSPHRASE: process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015",
        INDEXER_API_URL: process.env.INDEXER_API_URL || "http://localhost:4000",
        BUSINESS_REGISTRY_CONTRACT_ID: process.env.BUSINESS_REGISTRY_CONTRACT_ID || MOCK_CONTRACT_ID,
        FINANCIAL_LEDGER_CONTRACT_ID: process.env.FINANCIAL_LEDGER_CONTRACT_ID || MOCK_CONTRACT_ID,
        ATTESTATION_REGISTRY_CONTRACT_ID: process.env.ATTESTATION_REGISTRY_CONTRACT_ID || MOCK_CONTRACT_ID,
      };
    }
    const issues = formatZodError(result.error);
    console.error(`\n[HerLedger] ❌ Missing or invalid server environment variables:\n`);
    console.table(issues);
    console.error(`\nSee .env.example for required configuration.\n`);
    throw new Error("Invalid server environment configuration");
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
