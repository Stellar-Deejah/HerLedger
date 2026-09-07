import { publicEnvSchema, formatZodError, type PublicEnv, type ServerEnv } from "./schema.js";

export type { PublicEnv, ServerEnv };
export type { StellarNetworkConfig, ContractConfig } from "./server.js";
export {
  getServerEnv,
  getStellarNetworkConfig,
  getContractConfig,
  validateNetworkConsistency,
} from "./server.js";

export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = formatZodError(result.error);
    console.error(`\n[HerLedger] ❌ Missing or invalid public environment variables:\n`);
    console.table(issues);
    console.error(`\nSee .env.example for required configuration.\n`);
    throw new Error("Missing or invalid public environment variables. Check console for details.");
  }
  return result.data;
}
