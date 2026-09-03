import { describe, it, expect } from "vitest";

import { truncateAddress, formatAmount, formatLedger, formatDate } from "../format";

describe("format utilities", () => {
  describe("truncateAddress", () => {
    it("truncates standard 56-character Stellar public keys to default 6 leading/trailing chars", () => {
      const fullAddress = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFSSTY2ELW6CUSIZD";
      const truncated = truncateAddress(fullAddress);
      expect(truncated).toBe("GBRPYH…CUSIZD");
      expect(truncated.length).toBe(13); // 6 + 1 (ellipsis) + 6
    });

    it("returns short addresses or strings unchanged if length <= chars * 2 + 3", () => {
      expect(truncateAddress("")).toBe("");
      expect(truncateAddress("G12345")).toBe("G12345");
      expect(truncateAddress("123456789012345")).toBe("123456789012345");
    });

    it("truncates with custom char count", () => {
      const fullAddress = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFSSTY2ELW6CUSIZD";
      expect(truncateAddress(fullAddress, 4)).toBe("GBRP…SIZD");
      expect(truncateAddress(fullAddress, 8)).toBe("GBRPYHIL…W6CUSIZD");
    });
  });

  describe("formatAmount", () => {
    it("formats a whole stroop amount", () => {
      expect(formatAmount(10_000_000n)).toBe("1.0000000");
    });

    it("formats a fractional stroop amount", () => {
      expect(formatAmount(12_345_678n)).toBe("1.2345678");
    });

    it("formats zero", () => {
      expect(formatAmount(0n)).toBe("0.0000000");
    });

    it("formats negative amounts with a leading sign", () => {
      expect(formatAmount(-10_000_000n)).toBe("-1.0000000");
      expect(formatAmount(-12_345_678n)).toBe("-1.2345678");
    });

    it("handles a value above Number.MAX_SAFE_INTEGER without precision loss", () => {
      // 2^60 stroops is ~115 trillion — well past 2^53, where Number() would
      // start dropping low-order digits.
      const amount = 2n ** 60n + 1234567n;
      const expectedWhole = (2n ** 60n + 1234567n) / 10_000_000n;
      const expectedFractional = ((2n ** 60n + 1234567n) % 10_000_000n).toString().padStart(7, "0");

      expect(formatAmount(amount)).toBe(`${expectedWhole}.${expectedFractional}`);
    });

    it("formats the maximum i128 value (2^127 - 1) exactly", () => {
      const amount = 2n ** 127n - 1n;
      const result = formatAmount(amount);

      // Recompute the expected string with pure BigInt arithmetic so the test
      // itself does not round-trip through Number.
      const expectedWhole = amount / 10_000_000n;
      const expectedFractional = (amount % 10_000_000n).toString().padStart(7, "0");

      expect(result).toBe(`${expectedWhole}.${expectedFractional}`);
      // The result must retain every digit — no exponential notation or rounding.
      expect(result).not.toContain("e");
    });

    it("supports a configurable decimals count", () => {
      expect(formatAmount(123n, 2)).toBe("1.23");
      expect(formatAmount(123n, 0)).toBe("123");
    });

    it("groups the whole part with the locale's separators (en)", () => {
      // 1,234,567,890 stroops = 123,456,789 whole units
      expect(formatAmount(1234567890000000n, "en")).toBe("123,456,789.0000000");
    });

    it("formats amounts correctly for en, es, and fr locales", () => {
      const amount = 1234567890000000n;
      expect(formatAmount(amount, "en")).toBe("123,456,789.0000000");
      expect(formatAmount(amount, "es")).toBe("123.456.789.0000000");
      // fr uses a narrow no-break space (U+202F) for digit grouping
      expect(formatAmount(amount, "fr")).toBe("123\u202F456\u202F789.0000000");
    });

    it("keeps exact fractional precision without rounding for large i128 values", () => {
      // Beyond Number.MAX_SAFE_INTEGER — must never round or lose digits.
      // Grouping separators are stripped before comparison; the significant
      // digits (including all 7 fractional places) must match exactly.
      const huge = 90071992547409931234567890n;
      const decimals = 7;
      const factor = BigInt(10 ** decimals);
      const whole = huge / factor;
      const fractional = (huge % factor).toString().padStart(decimals, "0");
      expect(formatAmount(huge, "en").replace(/,/g, "")).toBe(`${whole}.${fractional}`);
    });

    it("returns the raw integer when decimals is 0", () => {
      expect(formatAmount(123456789n, "en", 0)).toBe("123456789");
    });
  });

  describe("formatLedger", () => {
    it("formats ledger sequence number with locale-aware grouping (en)", () => {
      expect(formatLedger(1234567)).toBe("Ledger 1,234,567");
    });

    it("groups digits per locale (es, fr)", () => {
      expect(formatLedger(1234567, "es")).toBe("Ledger 1.234.567");
      expect(formatLedger(1234567, "fr")).toBe("Ledger 1\u202F234\u202F567");
    });
  });

  describe("formatDate", () => {
    const iso = "2026-08-22T10:00:00.000Z";

    it("formats with the locale's date conventions (en, es, fr)", () => {
      expect(formatDate(iso, "en")).toBe("Aug 22, 2026");
      expect(formatDate(iso, "es")).toBe("22 ago 2026");
      expect(formatDate(iso, "fr")).toBe("22 août 2026");
    });

    it("accepts Date objects as well as ISO strings", () => {
      expect(formatDate(new Date(iso), "en")).toBe("Aug 22, 2026");
    });
  });
});
