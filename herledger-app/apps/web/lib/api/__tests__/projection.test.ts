import { describe, expect, it } from "vitest";

import { projectFields } from "../projection";

describe("projectFields projection utility", () => {
  const sampleObj = {
    id: "att-123",
    attestationId: "attest-001",
    attesterAddress: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFSSTY2ELW6CUSIZD",
    claimHash: "0xhash123",
    claimDescription: "Verified revenue",
    amount: "1000",
  };

  it("projects only allowed fields", () => {
    const projected = projectFields(sampleObj, [
      "id",
      "attestationId",
      "attesterAddress",
    ]);

    expect(projected).toEqual({
      id: "att-123",
      attestationId: "attest-001",
      attesterAddress: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFSSTY2ELW6CUSIZD",
    });
    expect(projected).not.toHaveProperty("claimHash");
    expect(projected).not.toHaveProperty("amount");
  });

  it("returns full object when all fields are in allowlist", () => {
    const fields = Object.keys(sampleObj) as (keyof typeof sampleObj)[];
    const projected = projectFields(sampleObj, fields);

    expect(projected).toEqual(sampleObj);
    expect(projected).toHaveProperty("claimHash", "0xhash123");
  });

  it("returns empty object when allowlist is empty", () => {
    const projected = projectFields(sampleObj, []);
    expect(projected).toEqual({});
  });

  it("ignores allowed fields that do not exist on target object", () => {
    const projected = projectFields(sampleObj, ["id", "nonExistentField" as keyof typeof sampleObj]);
    expect(projected).toEqual({ id: "att-123" });
  });

  it("handles null or undefined target gracefully", () => {
    expect(projectFields(null as unknown as typeof sampleObj, ["id"])).toEqual({});
    expect(projectFields(undefined as unknown as typeof sampleObj, ["id"])).toEqual({});
  });
});
