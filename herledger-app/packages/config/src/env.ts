import { z } from "zod";

// ---------------------------------------------------------------------------
// Server-side environment schema (never exposed to browser)
// ---------------------------------------------------------------------------
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  STELLAR_NETWORK: z.enum(["testnet", "mainnet"]),
  STELLAR_RPC_URL: z.string().url(),
  STELLAR_HORIZON_URL: z.string().url(),
  STELLAR_NETWORK_PASSPHRASE: z.string().min(1),
  BUSINESS_REGISTRY_CONTRACT_ID: z.string().min(1),
  FINANCIAL_LEDGER_CONTRACT_ID: z.string().min(1),
  ATTESTATION_REGISTRY_CONTRACT_ID: z.string().min(1),
  INDEXER_API_URL: z.string().url(),
});

// ---------------------------------------------------------------------------
// Browser-safe environment schema (NEXT_PUBLIC_* only)
// ---------------------------------------------------------------------------
const publicEnvSchema = z.object({
  NEXT_PUBLIC_STELLAR_NETWORK: z.enum(["testnet", "mainnet"]),
  NEXT_PUBLIC_STELLAR_RPC_URL: z.string().url(),
  NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID: z.string().min(1),
  NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID: z.string().min(1),
  NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Validate and return server-side environment variables.
 * Throws with a descriptive message on missing/invalid values.
 * Must only be called in server-side code.
 */
export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(
      `[HerLedger] Missing or invalid server environment variables:\n${issues}\n\nSee .env.example for required configuration.`
    );
  }
  return result.data;
}

/**
 * Validate and return browser-safe environment variables.
 * Safe to call in both client and server code.
 */
export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(
      `[HerLedger] Missing or invalid public environment variables:\n${issues}\n\nSee .env.example for required configuration.`
    );
  }
  return result.data;
}
