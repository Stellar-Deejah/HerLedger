import type { FastifyInstance } from "fastify";
import { getPrismaClient } from "../../db/client.js";
import { checkRpcHealth } from "@herledger/sdk";
import { getStellarNetworkConfig } from "@herledger/config/server";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (_req, reply) => {
    let dbHealthy = false;
    try {
      await getPrismaClient().$queryRaw`SELECT 1`;
      dbHealthy = true;
    } catch {
      // DB is down — continue to report RPC status too.
    }

    const stellarConfig = getStellarNetworkConfig();
    const rpcHealth = await checkRpcHealth(stellarConfig);

    const overallStatus = dbHealthy && rpcHealth.healthy ? "ok" : "degraded";
    const statusCode = overallStatus === "ok" ? 200 : 503;

    return reply.status(statusCode).send({
      data: {
        status: overallStatus,
        database: dbHealthy ? "connected" : "unavailable",
        rpc: {
          healthy: rpcHealth.healthy,
          activeEndpoint: rpcHealth.activeEndpoint,
          latestLedger: rpcHealth.latestLedger,
          error: rpcHealth.error,
          endpoints: rpcHealth.endpoints,
        },
      },
      error:
        overallStatus === "ok"
          ? null
          : {
              code: "SERVICE_DEGRADED",
              message: [
                !dbHealthy && "Database connection failed",
                !rpcHealth.healthy && "RPC health check failed",
              ]
                .filter(Boolean)
                .join("; "),
            },
    });
  });
}
