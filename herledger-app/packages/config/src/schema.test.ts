import { describe, it, expect, vi } from "vitest";
import { serverEnvSchema, publicEnvSchema, formatZodError } from "./schema.js";

// Mock StrKey.isValidContract so contract IDs below only need to look like a
// 56-char "C..." strkey, not be a cryptographically valid one.
vi.mock("@stellar/stellar-sdk", () => {
  return {
    StrKey: {
      isValidContract: (val: string) => val.startsWith("C") && val.length === 56,
    },
  };
});

const VALID_SERVER_ENV = {
  NODE_ENV: "development",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  BETTER_AUTH_SECRET: "05fddafc9c2b3b1a6a57ab04d3677c73f59779b7ba60aaf931a38672f93ccc78",
  STELLAR_NETWORK: "testnet",
  STELLAR_RPC_URL: "http://localhost:8000",
  STELLAR_HORIZON_URL: "http://localhost:8000",
  STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  BUSINESS_REGISTRY_CONTRACT_ID: "CA7JDAO9SGZ8EZEQHTJEXNXB7N6Q9O7N8Y9O7N8Y9O7N8Y9O7N8Y9O7N",
  FINANCIAL_LEDGER_CONTRACT_ID: "CA7JDAO9SGZ8EZEQHTJEXNXB7N6Q9O7N8Y9O7N8Y9O7N8Y9O7N8Y9O7N",
  ATTESTATION_REGISTRY_CONTRACT_ID: "CA7JDAO9SGZ8EZEQHTJEXNXB7N6Q9O7N8Y9O7N8Y9O7N8Y9O7N8Y9O7N",
  INDEXER_API_URL: "http://localhost:8080",
};

describe("Environment Schema", () => {
  describe("serverEnvSchema", () => {
    it("should pass when all required vars are present (with STELLAR_RPC_URL)", () => {
      const result = serverEnvSchema.safeParse(VALID_SERVER_ENV);
      expect(result.success).toBe(true);
    });

    it("should pass when STELLAR_RPC_URLS is used instead of STELLAR_RPC_URL", () => {
      const { STELLAR_RPC_URL: _omitted, ...rest } = VALID_SERVER_ENV;
      const result = serverEnvSchema.safeParse({
        ...rest,
        STELLAR_RPC_URLS: "http://localhost:8000",
      });
      expect(result.success).toBe(true);
    });

    it("should pass when STELLAR_RPC_URLS contains multiple comma-separated URLs", () => {
      const { STELLAR_RPC_URL: _omitted, ...rest } = VALID_SERVER_ENV;
      const result = serverEnvSchema.safeParse({
        ...rest,
        STELLAR_RPC_URLS: "http://rpc1.example.com,http://rpc2.example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should pass when both STELLAR_RPC_URL and STELLAR_RPC_URLS are present", () => {
      const result = serverEnvSchema.safeParse({
        ...VALID_SERVER_ENV,
        STELLAR_RPC_URLS: "http://rpc1.example.com,http://rpc2.example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should fail when neither STELLAR_RPC_URL nor STELLAR_RPC_URLS is set", () => {
      const { STELLAR_RPC_URL: _omitted, ...rest } = VALID_SERVER_ENV;
      const result = serverEnvSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("should fail when STELLAR_RPC_URLS contains invalid URLs", () => {
      const { STELLAR_RPC_URL: _omitted, ...rest } = VALID_SERVER_ENV;
      const result = serverEnvSchema.safeParse({
        ...rest,
        STELLAR_RPC_URLS: "not-a-url,also-not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("should fail when all required vars are missing", () => {
      const result = serverEnvSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = formatZodError(result.error);
        expect(issues.length).toBeGreaterThan(5); // several required fields
        expect(issues.some((i) => i.Variable === "DATABASE_URL")).toBe(true);
      }
    });

    it("should fail when partially missing", () => {
      const { APP_URL: _APP_URL, ...partial } = VALID_SERVER_ENV;
      const result = serverEnvSchema.safeParse(partial);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = formatZodError(result.error);
        expect(issues.length).toBe(1);
        expect(issues[0]!.Variable).toBe("APP_URL");
      }
    });

    describe("BETTER_AUTH_SECRET entropy", () => {
      it("rejects a short passphrase padded to the old 32-char minimum", () => {
        const result = serverEnvSchema.safeParse({
          ...VALID_SERVER_ENV,
          BETTER_AUTH_SECRET: "dev-secret-must-be-at-least-32c", // 32 chars, not hex
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const issues = formatZodError(result.error);
          expect(issues.some((i) => i.Variable === "BETTER_AUTH_SECRET")).toBe(true);
        }
      });

      it("rejects a 64-char value that isn't hex", () => {
        const result = serverEnvSchema.safeParse({
          ...VALID_SERVER_ENV,
          BETTER_AUTH_SECRET: "not-hex-".repeat(8), // 64 chars, contains '-'
        });
        expect(result.success).toBe(false);
      });

      it("rejects a hex string shorter than 64 characters", () => {
        const result = serverEnvSchema.safeParse({
          ...VALID_SERVER_ENV,
          BETTER_AUTH_SECRET: "ab".repeat(31), // 62 hex chars
        });
        expect(result.success).toBe(false);
      });

      it("accepts a 64-character hex string", () => {
        const result = serverEnvSchema.safeParse({
          ...VALID_SERVER_ENV,
          BETTER_AUTH_SECRET: "ab".repeat(32), // 64 hex chars
        });
        expect(result.success).toBe(true);
      });

      it("accepts a hex string longer than 64 characters", () => {
        const result = serverEnvSchema.safeParse({
          ...VALID_SERVER_ENV,
          BETTER_AUTH_SECRET: "ab".repeat(40), // 80 hex chars
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("publicEnvSchema", () => {
    const VALID_PUBLIC_ENV = {
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
      NEXT_PUBLIC_STELLAR_RPC_URL: "http://localhost:8000",
      NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID:
        "CA7JDAO9SGZ8EZEQHTJEXNXB7N6Q9O7N8Y9O7N8Y9O7N8Y9O7N8Y9O7N",
      NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID:
        "CA7JDAO9SGZ8EZEQHTJEXNXB7N6Q9O7N8Y9O7N8Y9O7N8Y9O7N8Y9O7N",
      NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID:
        "CA7JDAO9SGZ8EZEQHTJEXNXB7N6Q9O7N8Y9O7N8Y9O7N8Y9O7N8Y9O7N",
    };

    it("should pass when all required vars are present", () => {
      const result = publicEnvSchema.safeParse(VALID_PUBLIC_ENV);
      expect(result.success).toBe(true);
    });

    it("should fail when contract ID is missing", () => {
      const { NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID: _omitted, ...partial } = VALID_PUBLIC_ENV;
      const result = publicEnvSchema.safeParse(partial);
      expect(result.success).toBe(false);
    });
  });
});
