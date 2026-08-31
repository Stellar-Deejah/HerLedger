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

/**
 * Requires >= 64 hexadecimal characters (32 bytes) of entropy. A hex charset
 * check is a cheap, reliable proxy for "was this actually generated with
 * something like `openssl rand -hex 32`" rather than typed by hand -- a
 * human-chosen passphrase of the same length ("secret-must-be-at-least...")
 * has far less real entropy per character than random hex does, so length
 * alone (the previous `.min(32)`) wasn't enough to keep a weak value like
 * `"secret"` padded out to 32 chars from passing.
 */
const _authSecretEntropy = z.string().refine((val) => /^[0-9a-fA-F]{64,}$/.test(val), {
  message:
    "Must be at least 64 hexadecimal characters (32 bytes) of entropy. Generate one with: openssl rand -hex 32",
});

export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development")
      .describe("Node environment"),
    APP_URL: z.string().url().describe("The canonical URL of the web application"),
    DATABASE_URL: z.string().min(1).describe("PostgreSQL connection string"),
    BETTER_AUTH_SECRET: z.string().min(32).describe("Secret key for auth session encryption"),
    RESEND_API_KEY: z.string().optional().describe("Resend API key for transactional emails"),
    EMAIL_FROM: z
      .string()
      .optional()
      .default("HerLedger <onboarding@resend.dev>")
      .describe("Default sender address for emails"),
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
    INDEXER_API_SECRET: z
      .string()
      .min(32)
      .describe("Shared secret for authenticating requests to the indexer API"),
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
