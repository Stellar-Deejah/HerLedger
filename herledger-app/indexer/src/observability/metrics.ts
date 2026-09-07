import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const register = new Registry();

// Collect standard Node.js / process default metrics
collectDefaultMetrics({ register, prefix: "herledger_indexer_" });

/**
 * Counter for total financial events successfully indexed.
 */
export const eventsIndexedTotal = new Counter({
  name: "events_indexed_total",
  help: "Total number of financial events successfully indexed",
  labelNames: ["event_type", "status"] as const,
  registers: [register],
});

/**
 * Gauge for the ledger lag between network tip and indexer checkpoint.
 */
export const syncLagLedgers = new Gauge({
  name: "sync_lag_ledgers",
  help: "Lag in ledgers between current Stellar network tip and indexer checkpoint",
  registers: [register],
});

/**
 * Histogram for Stellar RPC and Horizon network request latencies in seconds.
 */
export const rpcRequestDurationSeconds = new Histogram({
  name: "rpc_request_duration_seconds",
  help: "Stellar RPC / Horizon request duration in seconds",
  labelNames: ["operation", "status"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * Histogram for Prisma / Postgres database query durations in seconds.
 */
export const dbQueryDurationSeconds = new Histogram({
  name: "db_query_duration_seconds",
  help: "Database query execution duration in seconds",
  labelNames: ["operation"] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

/**
 * Returns Prometheus formatted metrics string.
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Returns the Prometheus content type header value.
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

/**
 * Resets all metrics for test isolation.
 */
export function resetMetrics(): void {
  register.resetMetrics();
}
