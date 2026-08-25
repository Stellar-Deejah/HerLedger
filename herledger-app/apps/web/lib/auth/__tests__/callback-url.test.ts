import { describe, it, expect } from "vitest";

import { validateCallbackUrl } from "../callback-url";

describe("validateCallbackUrl", () => {
  const allowedOrigins = ["http://localhost:3000", "https://app.herledger.example"];

  describe("malicious payloads (open-redirect prevention)", () => {
    it("drops protocol-relative URLs (//evil.com)", () => {
      expect(validateCallbackUrl("//evil.com", allowedOrigins)).toBeNull();
      expect(validateCallbackUrl("//evil.com/phishing", allowedOrigins)).toBeNull();
    });

    it("drops external absolute HTTP/HTTPS URLs (https://evil.com)", () => {
      expect(validateCallbackUrl("https://evil.com", allowedOrigins)).toBeNull();
      expect(validateCallbackUrl("http://evil.com/path", allowedOrigins)).toBeNull();
      expect(
        validateCallbackUrl("https://app.herledger.example.evil.com", allowedOrigins)
      ).toBeNull();
    });

    it("drops javascript: URI payloads (javascript:alert(1))", () => {
      expect(validateCallbackUrl("javascript:alert(1)", allowedOrigins)).toBeNull();
      expect(
        validateCallbackUrl("javascript:confirm(document.cookie)", allowedOrigins)
      ).toBeNull();
      expect(validateCallbackUrl("JAVASCRIPT:alert(1)", allowedOrigins)).toBeNull();
    });

    it("drops URL-encoded malicious variants (%2F%2Fevil.com, https%3A%2F%2Fevil.com)", () => {
      expect(validateCallbackUrl("%2F%2Fevil.com", allowedOrigins)).toBeNull();
      expect(validateCallbackUrl("https%3A%2F%2Fevil.com", allowedOrigins)).toBeNull();
      expect(validateCallbackUrl("%2F%2Fevil.com%2Fpath", allowedOrigins)).toBeNull();
      expect(validateCallbackUrl("javascript%3Aalert(1)", allowedOrigins)).toBeNull();
    });

    it("drops backslash path traversal tricks (/\\evil.com, \\evil.com)", () => {
      expect(validateCallbackUrl("/\\evil.com", allowedOrigins)).toBeNull();
      expect(validateCallbackUrl("\\evil.com", allowedOrigins)).toBeNull();
      expect(validateCallbackUrl("/\\/evil.com", allowedOrigins)).toBeNull();
    });

    it("drops data: and file: URI schemes", () => {
      expect(
        validateCallbackUrl("data:text/html,<script>alert(1)</script>", allowedOrigins)
      ).toBeNull();
      expect(validateCallbackUrl("file:///etc/passwd", allowedOrigins)).toBeNull();
    });

    it("drops invalid/null/undefined inputs", () => {
      expect(validateCallbackUrl(null, allowedOrigins)).toBeNull();
      expect(validateCallbackUrl(undefined, allowedOrigins)).toBeNull();
      expect(validateCallbackUrl("", allowedOrigins)).toBeNull();
    });
  });

  describe("valid payloads (same-origin relative & allowed origins)", () => {
    it("allows valid same-origin relative paths", () => {
      expect(validateCallbackUrl("/dashboard", allowedOrigins)).toBe("/dashboard");
      expect(validateCallbackUrl("/dashboard/attestations", allowedOrigins)).toBe(
        "/dashboard/attestations"
      );
      expect(
        validateCallbackUrl("/dashboard/activity?tab=1&page=2#section", allowedOrigins)
      ).toBe("/dashboard/activity?tab=1&page=2#section");
    });

    it("allows absolute URLs matching allowed origins and extracts relative path", () => {
      expect(
        validateCallbackUrl("http://localhost:3000/dashboard", allowedOrigins)
      ).toBe("/dashboard");
      expect(
        validateCallbackUrl(
          "https://app.herledger.example/dashboard/settings",
          allowedOrigins
        )
      ).toBe("/dashboard/settings");
    });
  });
});
