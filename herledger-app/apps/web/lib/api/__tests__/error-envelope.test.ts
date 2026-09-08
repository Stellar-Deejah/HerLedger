import { describe, it, expect } from "vitest";
import { z } from "zod";

import { createResponseSchema, ApiErrorSchema } from "../envelope";

describe("API Error Envelope Contract", () => {
  it("ApiErrorSchema requires code and message strings", () => {
    const valid = ApiErrorSchema.safeParse({ code: "TEST", message: "msg" });
    expect(valid.success).toBe(true);

    const noCode = ApiErrorSchema.safeParse({ message: "msg" });
    expect(noCode.success).toBe(false);

    const noMsg = ApiErrorSchema.safeParse({ code: "TEST" });
    expect(noMsg.success).toBe(false);
  });

  it("createResponseSchema produces a success | error union", () => {
    const DataSchema = z.object({ id: z.string() });
    const ResponseSchema = createResponseSchema(DataSchema);

    const success = ResponseSchema.safeParse({ data: { id: "1" }, error: null });
    expect(success.success).toBe(true);

    const error = ResponseSchema.safeParse({
      data: null,
      error: { code: "ERR", message: "fail" },
    });
    expect(error.success).toBe(true);

    // Invalid: both data and error non-null
    const invalid = ResponseSchema.safeParse({
      data: { id: "1" },
      error: { code: "ERR", message: "fail" },
    });
    expect(invalid.success).toBe(false);
  });
});
