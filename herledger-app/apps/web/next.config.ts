import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@herledger/sdk", "@herledger/config"],
  experimental: {
    typedRoutes: true,
  },
  turbopack: {
    resolveAlias: {
      "./attester-registry.js": "./attester-registry.ts",
      "./errors/index.js": "./errors/index.ts",
      "./rpc/client.js": "./rpc/client.ts",
      "./rpc/transactions.js": "./rpc/transactions.ts",
      "./wallet/freighter.js": "./wallet/freighter.ts",
      "./types/index.js": "./types/index.ts",
      "./schema.js": "./schema.ts",
      "./server.js": "./server.ts",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
