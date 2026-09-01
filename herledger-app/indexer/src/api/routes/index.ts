import type { FastifyInstance, FastifyPluginAsync, preHandlerHookHandler } from "fastify";
import { getServerEnv } from "@herledger/config";
import { healthRoutes } from "./health.js";
import { businessRoutes } from "./businesses.js";
import { supportedAssetsRoutes } from "./supported-assets.js";
import { indexerStatusRoutes } from "./indexer-status.js";
import { transactionRoutes } from "./transactions.js";
import { adminRoutes } from "./admin.js";
import { metricsRoutes } from "./metrics.js";
import { buildIndexerOpenApiSpec } from "../openapi.js";
import { getPrismaClient } from "../../db/client.js";
import { requirePersonalAccessToken } from "../auth/personal-access-token.js";

/**
 * Registers `plugin` under `prefix` inside its own encapsulated Fastify
 * context with `preHandler` applied to every route it defines. Fastify's
 * plugin encapsulation means a hook added via `addHook` here does not leak
 * out to routes registered outside this scope.
 */
function registerProtected(
  app: FastifyInstance,
  plugin: FastifyPluginAsync,
  prefix: string,
  preHandler: preHandlerHookHandler
): void {
  void app.register(
    async (scoped) => {
      scoped.addHook("preHandler", preHandler);
      await scoped.register(plugin);
    },
    { prefix }
  );
}

export function registerRoutes(app: FastifyInstance): void {
  const openApiSpec = buildIndexerOpenApiSpec();

  // OpenAPI Specification endpoint
  const serveOpenApi = (_req: unknown, reply: { send: (data: unknown) => void }) => {
    reply.send(openApiSpec);
  };
  app.get("/v1/openapi.json", serveOpenApi);
  app.get("/openapi.json", serveOpenApi);

  // Personal access token (Bearer scheme) required — these routes read a
  // business's financial events, so third-party integrations must
  // authenticate with a token instead of reading anonymously.
  // See "Personal Access Tokens" in the README for how a token is created.
  const pepper = getServerEnv().BETTER_AUTH_SECRET;
  const requireToken = requirePersonalAccessToken(getPrismaClient(), pepper);

  // Versioned v1 routes
  void app.register(healthRoutes, { prefix: "/v1/health" });
  void app.register(supportedAssetsRoutes, { prefix: "/v1/supported-assets" });
  void app.register(indexerStatusRoutes, { prefix: "/v1/indexer" });
  registerProtected(app, businessRoutes, "/v1/businesses", requireToken);
  registerProtected(app, transactionRoutes, "/v1/transactions", requireToken);
  void app.register(adminRoutes, { prefix: "/v1/admin" });
  void app.register(metricsRoutes, { prefix: "/metrics" });

  // Unversioned fallback/compatibility routes with Deprecation header
  const setDeprecationHeader = (reply: { header: (key: string, val: string) => void }) => {
    reply.header("Deprecation", "true");
    reply.header("Link", '</v1>; rel="successor-version"');
  };

  void app.register(async (subApp) => {
    subApp.addHook("onRequest", async (_req, reply) => {
      setDeprecationHeader(reply);
    });
    await subApp.register(healthRoutes, { prefix: "/health" });
    await subApp.register(supportedAssetsRoutes, { prefix: "/supported-assets" });
    await subApp.register(indexerStatusRoutes, { prefix: "/indexer" });
    registerProtected(subApp, businessRoutes, "/businesses", requireToken);
    registerProtected(subApp, transactionRoutes, "/transactions", requireToken);
  });
}
