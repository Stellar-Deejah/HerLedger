import { getStellarNetworkConfig } from "@herledger/config/server";
import { checkRpcHealth } from "@herledger/sdk";

import { NextRequest } from "next/server";

import { getClientIp } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { getPrismaClient } from "@/lib/db/client";

import packageJson from "../../../../package.json";

import type { HealthResponse } from "./schema";

// Read version from package.json — dynamic so health always reflects deployed build

const DB_TIMEOUT_MS = 2000;
const INDEXER_TIMEOUT_MS = 2000;

async function pingDb(): Promise<{ healthy: boolean; latencyMs: number | null; error?: string | null }> {
  const prisma = getPrismaClient();
  const start = Date.now();
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB ping timeout")), DB_TIMEOUT_MS)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1` as Promise<unknown>, timeout]);
    return { healthy: true, latencyMs: Date.now() - start, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "DB ping failed";
    return { healthy: false, latencyMs: null, error: message };
  }
}

async function pingIndexer(): Promise<{ healthy: boolean; latencyMs: number | null; error?: string | null }> {
  const url = process.env.INDEXER_API_URL ?? "http://localhost:4000";
  const endpoint = `${url.replace(/\/$/, "")}/v1/health`;
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INDEXER_TIMEOUT_MS);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { healthy: false, latencyMs, error: `Indexer responded with ${res.status}` };
    }
    return { healthy: true, latencyMs, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexer ping failed";
    // AbortError from timeout should be reported as timeout
    if (message.includes("aborted") || message.includes("timeout")) {
      return { healthy: false, latencyMs: null, error: "Indexer ping timeout" };
    }
    return { healthy: false, latencyMs: null, error: message };
  }
}

export async function GET(): Promise<Response> {
  const config = getStellarNetworkConfig();
  const [rpcHealth, dbHealth, indexerHealth] = await Promise.all([
    checkRpcHealth(config),
    pingDb(),
    pingIndexer(),
  ]);

  const healthy = rpcHealth.healthy && dbHealth.healthy && indexerHealth.healthy;
  const status = healthy ? "ok" : "degraded";

  return typedJson<HealthResponse>({
    data: {
      status,
      db: dbHealth,
      indexer: indexerHealth,
      version: (packageJson as { version?: string }).version ?? "0.0.0",
      rpc: {
        healthy: rpcHealth.healthy,
        activeEndpoint: rpcHealth.activeEndpoint,
        latestLedger: rpcHealth.latestLedger,
        error: rpcHealth.error,
        endpoints: rpcHealth.endpoints,
      },
    },
    error: null,
    meta: null,
  });
export function GET(req?: NextRequest) {
  if (req) {
    const limited = readLimiter.check(getClientIp(req));
    if (limited) return limited;
  }

  return typedJson<HealthResponse>({ data: { status: "ok" }, error: null });
}
