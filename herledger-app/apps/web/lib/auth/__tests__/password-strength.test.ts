import { describe, it, expect } from "vitest";

import { scorePassword, STRENGTH_LABELS } from "../password-strength.js";

describe("scorePassword", () => {
  it("scores an empty password as the weakest, with no suggestions", () => {
    const result = scorePassword("");
    expect(result.score).toBe(0);
    expect(result.label).toBe(STRENGTH_LABELS[0]);
    expect(result.suggestions).toEqual([]);
  });

  it("scores a short, common password as weak", () => {
    const result = scorePassword("password1");
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("scores a long, random passphrase as strong", () => {
    const result = scorePassword("correct horse battery staple giraffe");
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it("penalizes a password built from the user's own name/email", () => {
    const withoutUserInput = scorePassword("janedoe12345");
    const withUserInput = scorePassword("janedoe12345", ["jane doe", "jane@example.com"]);
    expect(withUserInput.score).toBeLessThanOrEqual(withoutUserInput.score);
  });

  it("increasing length monotonically does not weaken an already-strong password", () => {
    const shorter = scorePassword("Tr0ub4dor&3Tr0ub4dor&3");
    const longer = scorePassword("Tr0ub4dor&3Tr0ub4dor&3Tr0ub4dor&3");
    expect(longer.score).toBeGreaterThanOrEqual(shorter.score);
  });
});
