import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Default environment stays "node" — most tests (lib/, disputes/, sdk
    // helpers) don't touch the DOM and running them under node is faster.
    // Component/hook tests that need the DOM opt in per-file with a
    // `// @vitest-environment jsdom` pragma at the top of the file. See
    // hooks/__tests__/use-registration-flow.test.tsx for an example.
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks",
    typecheck: {
      enabled: true,
      include: ["**/*.type-test.ts"],
      tsconfig: "./tsconfig.typecheck.json",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "../../indexer/src/__mocks__/server-only.ts"),
    },
  },
});
