import { describe, it, expect } from "vitest";
import { resolveAttesterName, type AttesterRegistry } from "../attester-registry.js";

const KNOWN_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX";
const UNKNOWN_ADDRESS = "GZYXWVUTSRQPONMLKJIHGFEDCBA765432ZYXWVUTSRQPONMLKJIHGFED";

const registry: AttesterRegistry = {
  [KNOWN_ADDRESS]: { name: "Acme Auditing", description: "Auditing firm" },
};

describe("resolveAttesterName", () => {
  it("resolves a known attester address to its display name", () => {
    expect(resolveAttesterName(KNOWN_ADDRESS, registry)).toBe("Acme Auditing");
  });

  it("falls back to a truncated address for an unknown attester", () => {
    const result = resolveAttesterName(UNKNOWN_ADDRESS, registry);
    expect(result).not.toBe(UNKNOWN_ADDRESS);
    expect(result).toBe("GZYXWV…IHGFED");
  });

  it("returns the raw address unmodified if it's already short enough that truncation is a no-op", () => {
    const shortAddress = "GSHORT";
    expect(resolveAttesterName(shortAddress, registry)).toBe(shortAddress);
  });

  it("defaults to the KNOWN_ATTESTERS export when no registry is passed", () => {
    // KNOWN_ATTESTERS starts empty, so any address falls back to truncation.
    expect(resolveAttesterName(UNKNOWN_ADDRESS)).toBe("GZYXWV…IHGFED");
  });
});
