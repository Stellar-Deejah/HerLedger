import { describe, expect, it } from "vitest";

import { validateCallbackUrl } from "../validate-callback-url";

const ALLOWED = ["https://app.herledger.example"];

describe("validateCallbackUrl", () => {
  it("allows a plain same-origin relative path", () => {
    expect(validateCallbackUrl("/dashboard", ALLOWED)).toBe("/dashboard");
  });

  it("allows a same-origin relative path with query and hash", () => {
    expect(validateCallbackUrl("/dashboard/settings?tab=profile#top", ALLOWED)).toBe(
      "/dashboard/settings?tab=profile#top"
    );
  });

  it("allows a fully-qualified URL matching an allowed origin, normalized to a path", () => {
    expect(validateCallbackUrl("https://app.herledger.example/dashboard", ALLOWED)).toBe(
      "/dashboard"
    );
  });

  it("returns null for a missing value", () => {
    expect(validateCallbackUrl(null, ALLOWED)).toBeNull();
    expect(validateCallbackUrl(undefined, ALLOWED)).toBeNull();
    expect(validateCallbackUrl("", ALLOWED)).toBeNull();
  });

  it("returns null when no allowed origins are configured", () => {
    expect(validateCallbackUrl("/dashboard", [])).toBeNull();
  });

  // Open-redirect payload matrix -------------------------------------------
  // Each of these must be silently dropped (null), never surfaced as an
  // error, so a caller can always fall back to a known-safe default.
  const maliciousPayloads: Array<[label: string, payload: string]> = [
    ["protocol-relative URL", "//evil.com"],
    ["absolute URL to a foreign origin", "https://evil.com"],
    ["javascript: scheme", "javascript:alert(1)"],
    ["URL-encoded protocol-relative URL", "%2F%2Fevil.com"],
    ["URL-encoded absolute URL to a foreign origin", "https%3A%2F%2Fevil.com"],
    ["tab-smuggled protocol-relative URL", "/\t/evil.com"],
    ["backslash-based protocol-relative URL", "\\evil.com"],
    ["backslash after a leading slash", "/\\evil.com"],
    ["schemeless-slash absolute URL", "https:evil.com"],
    ["data: scheme", "data:text/html,<script>alert(1)</script>"],
    ["userinfo trick against a foreign host", "https://app.herledger.example@evil.com"],
  ];

  it.each(maliciousPayloads)("silently drops a malicious callbackUrl (%s)", (_label, payload) => {
    expect(validateCallbackUrl(payload, ALLOWED)).toBeNull();
  });
});
