import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    typecheck: {
      enabled: true,
      include: ["**/*.type-test.ts"],
      tsconfig: "./tsconfig.typecheck.json",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": "node:events",
    },
  },
});
