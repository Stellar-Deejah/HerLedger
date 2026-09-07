import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";

vi.mock("server-only", () => ({}));

import { registerRoutes } from "../routes/index.js";
import { buildIndexerOpenApiSpec } from "../openapi.js";

describe("Indexer OpenAPI Specification", () => {
  it("generates a valid OpenAPI 3.1 document", () => {
    const spec = buildIndexerOpenApiSpec();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("HerLedger Indexer API");
    expect(spec.paths["/v1/health"]).toBeDefined();
    expect(spec.paths["/v1/businesses/{businessId}"]).toBeDefined();
    expect(spec.paths["/v1/admin/replay/{errorId}"]).toBeDefined();
  });

  it("serves OpenAPI spec at GET /v1/openapi.json and GET /openapi.json", async () => {
    const app = Fastify();
    registerRoutes(app);
    await app.ready();

    const resV1 = await app.inject({ method: "GET", url: "/v1/openapi.json" });
    expect(resV1.statusCode).toBe(200);
    const jsonV1 = JSON.parse(resV1.body);
    expect(jsonV1.openapi).toBe("3.1.0");

    const resAlias = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(resAlias.statusCode).toBe(200);
    const jsonAlias = JSON.parse(resAlias.body);
    expect(jsonAlias.openapi).toBe("3.1.0");
  });
});
