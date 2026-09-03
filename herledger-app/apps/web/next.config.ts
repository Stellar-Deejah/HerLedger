import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const appUrl = process.env.APP_URL || "http://localhost:3000";

// Loads the next-intl request configuration (locale detection + message
// resolution) from i18n/request.ts for every [locale] route.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = withNextIntl({
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
        source: "/api/activity/summary",
        destination: "/api/v1/activity/summary",
      },
      {
        source: "/api/activity/export",
        destination: "/api/v1/activity/export",
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
});

export default nextConfig;
