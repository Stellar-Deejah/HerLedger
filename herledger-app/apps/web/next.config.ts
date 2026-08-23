import type { NextConfig } from "next";

const appUrl = process.env.APP_URL || "http://localhost:3000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@herledger/sdk", "@herledger/config", "@herledger/db"],
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
      // @herledger/db -- was missing entirely (only @herledger/sdk and
      // @herledger/config had entries above), so any page importing it
      // 500'd under `next dev`'s Turbopack resolver.
      "./client.js": "./client.ts",
      "./mock.js": "./mock.ts",
      "./types.js": "./types.ts",
      "../types.js": "../types.ts",
      "./utils/pagination.js": "./utils/pagination.ts",
      "./repositories/businesses.js": "./repositories/businesses.ts",
      "./repositories/financial-events.js": "./repositories/financial-events.ts",
      "./repositories/attestations.js": "./repositories/attestations.ts",
      "./repositories/attesters.js": "./repositories/attesters.ts",
      "./repositories/checkpoint.js": "./repositories/checkpoint.ts",
      "./repositories/indexer-errors.js": "./repositories/indexer-errors.ts",
      "./repositories/stellar-transactions.js": "./repositories/stellar-transactions.ts",
      "./repositories/users.js": "./repositories/users.ts",
      "./repositories/disputes.js": "./repositories/disputes.ts",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    // @herledger/db's index.ts re-exports the vitest-dependent
    // createMockDbClient alongside its real production exports (see
    // packages/db/src/index.ts / mock.ts). Any consumer of the package's
    // main barrel -- including middleware.ts, which needs it for real
    // Prisma-backed session lookups -- ends up statically bundling vitest,
    // which throws at module-eval time when loaded outside vitest's own
    // runner ("Vitest failed to access its internal state"). vitest is
    // never legitimately reachable at runtime through anything Next.js
    // actually serves (vitest tests run through Vitest's own pipeline, not
    // this webpack config), so it's safe to stub it out here entirely.
    config.resolve.alias = {
      ...config.resolve.alias,
      vitest: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: appUrl },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With, x-admin-token",
          },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: "/api/v1/health",
      },
      {
        source: "/api/activity/recent",
        destination: "/api/v1/activity/recent",
      },
      {
        source: "/api/attestations",
        destination: "/api/v1/attestations",
      },
      {
        source: "/api/attestations/:path*",
        destination: "/api/v1/attestations/:path*",
      },
      {
        source: "/api/business/register",
        destination: "/api/v1/business/register",
      },
      {
        source: "/api/disputes",
        destination: "/api/v1/disputes",
      },
      {
        source: "/api/disputes/:path*",
        destination: "/api/v1/disputes/:path*",
      },
      {
        source: "/api/events/stream",
        destination: "/api/v1/events/stream",
      },
    ];
  },
};

export default nextConfig;
