import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";

const stellarContractId = z.string().refine((val) => StrKey.isValidContract(val), {
  message: "Must be a valid Stellar contract address (56-char C... strkey)",
});

/**
 * Validates a comma-separated list of URLs (at least one required).
 */
const commaSeparatedUrls = z
  .string()
  .min(1)
  .refine(
    (val) => {
      const urls = val
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);
      if (urls.length === 0) return false;
      return urls.every((u) => {
        try {
          new URL(u);
          return true;
        } catch {
          return false;
        }
      });
    },
    {
      message: "Must be one or more valid URLs separated by commas",
    }
  );

export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development")
      .describe("Node environment"),
    APP_URL: z.string().url().describe("The canonical URL of the web application"),
    DATABASE_URL: z.string().min(1).describe("PostgreSQL connection string"),
    BETTER_AUTH_SECRET: z.string().min(32).describe("Secret key for auth session encryption"),
    RESEND_API_KEY: z.string().min(1).describe("Resend API key, used to send verification emails"),
    EMAIL_FROM: z
      .string()
      .min(1)
      .describe('Sender address for transactional email, e.g. "HerLedger <verify@herledger.app>"'),
    STELLAR_NETWORK: z.enum(["testnet", "mainnet"]).describe("Stellar network selection"),
    STELLAR_RPC_URL: z
      .string()
      .url()
      .optional()
      .describe("Soroban RPC endpoint URL (single, deprecated — prefer STELLAR_RPC_URLS)"),
    STELLAR_RPC_URLS: commaSeparatedUrls
      .optional()
      .describe("Comma-separated Soroban RPC endpoint URLs (primary first)"),
    STELLAR_HORIZON_URL: z.string().url().describe("Horizon API endpoint URL"),
    STELLAR_NETWORK_PASSPHRASE: z.string().min(1).describe("Stellar network passphrase"),
    INDEXER_API_URL: z.string().url().describe("Internal URL for the indexer service"),
    BUSINESS_REGISTRY_CONTRACT_ID: stellarContractId.describe(
      "Contract ID for the Business Registry"
    ),
    FINANCIAL_LEDGER_CONTRACT_ID: stellarContractId.describe(
      "Contract ID for the Financial Ledger"
    ),
    ATTESTATION_REGISTRY_CONTRACT_ID: stellarContractId.describe(
      "Contract ID for the Attestation Registry"
    ),
  })
  .refine((data) => data.STELLAR_RPC_URLS != null || data.STELLAR_RPC_URL != null, {
    message: "Either STELLAR_RPC_URLS or STELLAR_RPC_URL must be set",
    path: ["STELLAR_RPC_URLS"],
  });

type _WithNextPublic<T> = { [K in keyof T as `NEXT_PUBLIC_${string & K}`]: T[K] };

const _withNextPublic = <T extends z.ZodRawShape>(shape: T): _WithNextPublic<T> => {
  return Object.fromEntries(
    Object.entries(shape).map(([key, schema]) => [`NEXT_PUBLIC_${key}`, schema])
  ) as _WithNextPublic<T>;
};

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_STELLAR_NETWORK: z
    .enum(["testnet", "mainnet"])
    .describe("Stellar network selection for the browser"),
  NEXT_PUBLIC_STELLAR_RPC_URL: z
    .string()
    .url()
    .describe("Soroban RPC endpoint URL for the browser"),
  NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID: stellarContractId.describe(
    "Contract ID for the Business Registry"
  ),
  NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID: stellarContractId.describe(
    "Contract ID for the Financial Ledger"
  ),
  NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID: stellarContractId.describe(
    "Contract ID for the Attestation Registry"
  ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function formatZodError(error: z.ZodError) {
  // Recursively find the shape of a Zod schema (unwrapping ZodEffects)
  const getShape = (schema: unknown): Record<string, z.ZodTypeAny> | undefined => {
    if (!schema) return undefined;
    const s = schema as { shape?: Record<string, z.ZodTypeAny>; _def?: { schema?: unknown } };
    if (s.shape) return s.shape;
    if (s._def && s._def.schema) {
      return getShape(s._def.schema);
    }
    return undefined;
  };

  const serverShape = getShape(serverEnvSchema) || {};
  const publicShape = getShape(publicEnvSchema) || {};

  const issues = error.issues.map((i) => {
    const path = i.path.join(".");
    let description = "No description available";

    const serverField = serverShape[path];
    const publicField = publicShape[path];

    if (serverField?.description) description = serverField.description;
    else if (publicField?.description) description = publicField.description;

    return {
      Variable: path,
      Error: i.message,
      Description: description,
    };
  });

  return issues;
}
