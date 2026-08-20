import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": "node:events",
    },
  },
  test: {
    environment: "node",
  },
});
