import { describe, it, expect } from "vitest";

import { truncateAddress, formatAmount, formatLedger } from "../format";

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
  });

  describe("formatLedger", () => {
    it("formats ledger sequence number", () => {
      expect(formatLedger(1234567)).toBe("Ledger 1,234,567");
    });
  });
});
