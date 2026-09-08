import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../../server.js";
import { getCorrelationId } from "../../../observability/index.js";
import type { FastifyInstance } from "fastify";

describe("Correlation ID Middleware", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildServer();
    // Add a test route to inspect context correlationId
    app.get("/test-correlation", async () => {
      return {
        contextCorrelationId: getCorrelationId(),
      };
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("generates and attaches a UUID correlationId when none is provided in request headers", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/test-correlation",
    });

    expect(res.statusCode).toBe(200);
    const correlationHeader = res.headers["x-correlation-id"];
    expect(correlationHeader).toBeDefined();
    expect(typeof correlationHeader).toBe("string");
    expect(correlationHeader).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    const body = JSON.parse(res.body);
    expect(body.contextCorrelationId).toBe(correlationHeader);
  });

  it("preserves incoming x-correlation-id header and propagates it into context and response header", async () => {
    const clientCorrelationId = "client-trace-abc-1234";

    const res = await app.inject({
      method: "GET",
      url: "/test-correlation",
      headers: {
        "x-correlation-id": clientCorrelationId,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-correlation-id"]).toBe(clientCorrelationId);

    const body = JSON.parse(res.body);
    expect(body.contextCorrelationId).toBe(clientCorrelationId);
  });

  it("accepts incoming x-request-id header as fallback correlationId", async () => {
    const clientRequestId = "req-id-5678-xyz";

    const res = await app.inject({
      method: "GET",
      url: "/test-correlation",
      headers: {
        "x-request-id": clientRequestId,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-correlation-id"]).toBe(clientRequestId);

    const body = JSON.parse(res.body);
    expect(body.contextCorrelationId).toBe(clientRequestId);
  });
});
