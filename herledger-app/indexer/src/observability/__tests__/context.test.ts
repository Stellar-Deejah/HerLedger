import { describe, it, expect } from "vitest";
import { runWithContext, getCorrelationId, getContext, generateCorrelationId } from "../context.js";

describe("Observability Context", () => {
  it("generates valid UUID v4 correlation IDs", () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("returns undefined when outside an active context", () => {
    expect(getCorrelationId()).toBeUndefined();
    expect(getContext()).toBeUndefined();
  });

  it("propagates correlationId within synchronous and asynchronous execution", async () => {
    const testId = "test-correlation-123";

    await runWithContext({ correlationId: testId, extra: "meta" }, async () => {
      expect(getCorrelationId()).toBe(testId);
      expect(getContext()).toEqual({ correlationId: testId, extra: "meta" });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(getCorrelationId()).toBe(testId);
    });

    expect(getCorrelationId()).toBeUndefined();
  });

  it("isolates nested or concurrent contexts correctly", async () => {
    const parentId = "parent-id";
    const childId = "child-id";

    await runWithContext({ correlationId: parentId }, async () => {
      expect(getCorrelationId()).toBe(parentId);

      await runWithContext({ correlationId: childId }, async () => {
        expect(getCorrelationId()).toBe(childId);
      });

      expect(getCorrelationId()).toBe(parentId);
    });
  });
});
