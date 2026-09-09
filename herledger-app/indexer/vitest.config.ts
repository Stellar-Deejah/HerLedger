import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    testTimeout: 15000,
    hookTimeout: 15000,
    env: {
      APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://herledger:herledger@localhost:5432/herledger_test",
      BETTER_AUTH_SECRET: "ab".repeat(32),
      STELLAR_NETWORK: "testnet",
      STELLAR_RPC_URLS: "https://soroban-testnet.stellar.org",
      STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org",
      STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
      INDEXER_API_URL: "http://localhost:4000",
      BUSINESS_REGISTRY_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
      FINANCIAL_LEDGER_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
      ATTESTATION_REGISTRY_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
    },
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "lcov"],
      // Scoped to financial-events.ts — the classification/derivation logic
      // (indexPayment, deriveEventId) this issue adds thorough fixture
      // coverage for. src/index/attestations.ts and src/index/businesses.ts
      // have no tests yet and are out of this issue's scope; including them
      // here would make the threshold unenforceable.
      include: ["src/index/financial-events.ts"],
      thresholds: {
        lines: 80,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "src/__mocks__/server-only.ts"),
    },
  },
});
