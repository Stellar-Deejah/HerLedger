import { publicEnvSchema, formatZodError, type PublicEnv, type ServerEnv } from "./schema";

const MOCK_CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

export type { PublicEnv, ServerEnv };
export function getPublicEnv(): PublicEnv {
  const env = {
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    NEXT_PUBLIC_STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
    NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID:
      process.env.NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID,
    NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID: process.env.NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID,
    NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID:
      process.env.NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID,
  };
  const result = publicEnvSchema.safeParse(env);
  if (!result.success) {
    if (process.env.SKIP_ENV_VALIDATION === "true" || process.env.SKIP_ENV_VALIDATION === "1") {
      console.warn(`\n[HerLedger] ⚠️ Public environment validation failed, but SKIP_ENV_VALIDATION is enabled. Using build-time defaults.\n`);
      return {
        NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
        NEXT_PUBLIC_STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
        NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID: MOCK_CONTRACT_ID,
        NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID: MOCK_CONTRACT_ID,
        NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID: MOCK_CONTRACT_ID,
      };
    }
    const issues = formatZodError(result.error);
    console.error(`\n[HerLedger] ❌ Missing or invalid public environment variables:\n`);
    console.table(issues);
    console.error(`\nSee .env.example for required configuration.\n`);
    throw new Error("Missing or invalid public environment variables. Check console for details.");
  }
  return result.data;
}
