import { describe, it, expect } from "vitest";

import { RequestSchema } from "../schema";

describe("attestations RequestSchema", () => {
  it("defaults includeRevoked to false when the param is absent", () => {
    const result = RequestSchema.parse({ includeRevoked: undefined });
    expect(result.includeRevoked).toBe(false);
  });

  it("parses includeRevoked=true to a boolean true", () => {
    const result = RequestSchema.parse({ includeRevoked: "true" });
    expect(result.includeRevoked).toBe(true);
  });

  it("parses includeRevoked=false to a boolean false", () => {
    const result = RequestSchema.parse({ includeRevoked: "false" });
    expect(result.includeRevoked).toBe(false);
  });

  it("accepts a real boolean, as apiClient callers pass before building the query string", () => {
    const result = RequestSchema.parse({ includeRevoked: true });
    expect(result.includeRevoked).toBe(true);
  });

  it("rejects an arbitrary non-boolean-like value", () => {
    const result = RequestSchema.safeParse({ includeRevoked: "yes" });
    expect(result.success).toBe(false);
  });
});
