import { typedJson } from "@/lib/api/route-handler";
import { checkRpcHealth } from "@herledger/sdk";
import { getStellarNetworkConfig } from "@herledger/config/server";

import type { HealthResponse } from "./schema";

export async function GET() {
  const config = getStellarNetworkConfig();
  const rpcHealth = await checkRpcHealth(config);

  const status = rpcHealth.healthy ? "ok" : "degraded";

  return typedJson<HealthResponse>({
    data: {
      status,
      rpc: {
        healthy: rpcHealth.healthy,
        activeEndpoint: rpcHealth.activeEndpoint,
        latestLedger: rpcHealth.latestLedger,
        error: rpcHealth.error,
        endpoints: rpcHealth.endpoints,
      },
    },
    error: null,
  });
}
