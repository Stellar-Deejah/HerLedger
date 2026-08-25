import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
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
