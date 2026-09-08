import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**", "src/contracts/__tests__/smoke.testnet.test.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "lcov"],
      // Scoped to the module this issue adds thorough tests for (round-trip
      // coverage of every exported encode/decode helper). The rest of the
      // package (contract call wrappers, generated ABI bindings) isn't
      // exercised by unit tests yet and enforcing an 80% floor across all of
      // it is a separate, much larger effort than this issue's scope.
      include: ["src/contracts/encoding.ts"],
      thresholds: {
        lines: 80,
        branches: 80,
      },
    },
  },
});
