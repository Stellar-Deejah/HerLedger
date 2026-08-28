import { getStellarNetworkConfig } from "@herledger/config/server";
import { checkRpcHealth } from "@herledger/sdk";
import { NextRequest } from "next/server";

import { getClientIp } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";


import type { HealthResponse } from "./schema";

export async function GET(req?: NextRequest) {
  if (req) {
    const limited = readLimiter.check(getClientIp(req));
    if (limited) return limited;
  }

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
