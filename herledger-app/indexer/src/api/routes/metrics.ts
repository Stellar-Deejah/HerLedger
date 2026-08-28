import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { getMetrics, getMetricsContentType } from "../../observability/index.js";

/**
 * Prometheus metrics endpoint exposing application & runtime metrics.
 */
export const metricsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (_request, reply) => {
    const metrics = await getMetrics();
    void reply.header("Content-Type", getMetricsContentType()).send(metrics);
  });
};
