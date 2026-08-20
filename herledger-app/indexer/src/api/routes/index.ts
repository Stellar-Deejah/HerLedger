import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { businessRoutes } from "./businesses.js";
import { supportedAssetsRoutes } from "./supported-assets.js";
import { indexerStatusRoutes } from "./indexer-status.js";
import { transactionRoutes } from "./transactions.js";
import { adminRoutes } from "./admin.js";
import { metricsRoutes } from "./metrics.js";

export function registerRoutes(app: FastifyInstance): void {
  void app.register(healthRoutes, { prefix: "/health" });
  void app.register(businessRoutes, { prefix: "/businesses" });
  void app.register(supportedAssetsRoutes, { prefix: "/supported-assets" });
  void app.register(indexerStatusRoutes, { prefix: "/indexer" });
  void app.register(transactionRoutes, { prefix: "/transactions" });
  void app.register(adminRoutes, { prefix: "/v1/admin" });
  void app.register(metricsRoutes, { prefix: "/metrics" });
}
