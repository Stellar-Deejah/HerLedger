import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { businessRoutes } from "./businesses.js";
import { supportedAssetsRoutes } from "./supported-assets.js";
import { indexerStatusRoutes } from "./indexer-status.js";
import { transactionRoutes } from "./transactions.js";
import { adminRoutes } from "./admin.js";
import { metricsRoutes } from "./metrics.js";
import { buildIndexerOpenApiSpec } from "../openapi.js";

export function registerRoutes(app: FastifyInstance): void {
  const openApiSpec = buildIndexerOpenApiSpec();

  // OpenAPI Specification endpoint
  const serveOpenApi = (_req: unknown, reply: { send: (data: unknown) => void }) => {
    reply.send(openApiSpec);
  };
  app.get("/v1/openapi.json", serveOpenApi);
  app.get("/openapi.json", serveOpenApi);

  // Versioned v1 routes
  void app.register(healthRoutes, { prefix: "/v1/health" });
  void app.register(businessRoutes, { prefix: "/v1/businesses" });
  void app.register(supportedAssetsRoutes, { prefix: "/v1/supported-assets" });
  void app.register(indexerStatusRoutes, { prefix: "/v1/indexer" });
  void app.register(transactionRoutes, { prefix: "/v1/transactions" });
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
    await subApp.register(businessRoutes, { prefix: "/businesses" });
    await subApp.register(supportedAssetsRoutes, { prefix: "/supported-assets" });
    await subApp.register(indexerStatusRoutes, { prefix: "/indexer" });
    await subApp.register(transactionRoutes, { prefix: "/transactions" });
  });
}
