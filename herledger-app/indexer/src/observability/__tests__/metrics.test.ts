import { describe, it, expect, beforeEach } from "vitest";
import {
  eventsIndexedTotal,
  syncLagLedgers,
  rpcRequestDurationSeconds,
  dbQueryDurationSeconds,
  getMetrics,
  getMetricsContentType,
  resetMetrics,
} from "../metrics.js";

describe("Prometheus Metrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("provides standard Prometheus content type", () => {
    const contentType = getMetricsContentType();
    expect(contentType).toContain("text/plain");
  });

  it("records events_indexed_total metric increments with labels", async () => {
    eventsIndexedTotal.inc({ event_type: "PaymentReceived", status: "Pending" });
    eventsIndexedTotal.inc({ event_type: "PaymentReceived", status: "Pending" });
    eventsIndexedTotal.inc({ event_type: "PaymentSent", status: "Pending" });

    const output = await getMetrics();
    expect(output).toContain("events_indexed_total");
    expect(output).toContain(
      'events_indexed_total{event_type="PaymentReceived",status="Pending"} 2'
    );
    expect(output).toContain('events_indexed_total{event_type="PaymentSent",status="Pending"} 1');
  });

  it("records sync_lag_ledgers gauge metric", async () => {
    syncLagLedgers.set(42);

    const output = await getMetrics();
    expect(output).toContain("sync_lag_ledgers 42");

    syncLagLedgers.set(0);
    const updatedOutput = await getMetrics();
    expect(updatedOutput).toContain("sync_lag_ledgers 0");
  });

  it("records rpc_request_duration_seconds histogram observations", async () => {
    const end = rpcRequestDurationSeconds.startTimer({ operation: "fetch_latest_ledger" });
    await new Promise((resolve) => setTimeout(resolve, 15));
    end({ status: "success" });

    const output = await getMetrics();
    expect(output).toContain("rpc_request_duration_seconds_bucket");
    expect(output).toContain('operation="fetch_latest_ledger"');
    expect(output).toContain('status="success"');
  });

  it("records db_query_duration_seconds histogram observations", async () => {
    dbQueryDurationSeconds.observe({ operation: "prisma_query" }, 0.025);

    const output = await getMetrics();
    expect(output).toContain("db_query_duration_seconds_bucket");
    expect(output).toContain('operation="prisma_query"');
  });
});
