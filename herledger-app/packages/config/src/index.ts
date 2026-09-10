import { publicEnvSchema, formatZodError, type PublicEnv, type ServerEnv } from "./schema";

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
    const issues = formatZodError(result.error);
    console.error(`\n[HerLedger] ❌ Missing or invalid public environment variables:\n`);
    console.table(issues);
    console.error(`\nSee .env.example for required configuration.\n`);
    throw new Error("Missing or invalid public environment variables. Check console for details.");
  }
  return result.data;
}
