import { describe, it, expect } from "vitest";
import { buildWebOpenApiSpec } from "@/lib/api/openapi";

describe("Web Next.js OpenAPI Specification", () => {
  it("generates valid OpenAPI 3.1 document", () => {
    const spec = buildWebOpenApiSpec();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("HerLedger Web API");
    expect(spec.paths["/api/v1/health"]).toBeDefined();
    expect(spec.paths["/api/v1/activity/recent"]).toBeDefined();
    expect(spec.paths["/api/v1/attestations"]).toBeDefined();
    expect(spec.paths["/api/v1/business/register"]).toBeDefined();
    expect(spec.paths["/api/v1/disputes"]).toBeDefined();
  });
});
