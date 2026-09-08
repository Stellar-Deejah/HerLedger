import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../../server.js";
import { eventsIndexedTotal, resetMetrics } from "../../../observability/index.js";
import type { FastifyInstance } from "fastify";

describe("Metrics Endpoint", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    resetMetrics();
    app = buildServer();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("exposes GET /metrics endpoint with Prometheus formatted output", async () => {
    eventsIndexedTotal.inc({ event_type: "PaymentReceived", status: "Pending" });

    const res = await app.inject({
      method: "GET",
      url: "/metrics",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toContain("events_indexed_total");
    expect(res.body).toContain("sync_lag_ledgers");
    expect(res.body).toContain("rpc_request_duration_seconds");
  });
});
