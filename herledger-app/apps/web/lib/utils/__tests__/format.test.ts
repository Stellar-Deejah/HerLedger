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
    it("formats stroop amounts with default 7 decimals", () => {
      expect(formatAmount(10000000n)).toBe("1.0000000");
      expect(formatAmount(123456789n)).toBe("12.3456789");
    });
  });

  describe("formatLedger", () => {
    it("formats ledger sequence number", () => {
      expect(formatLedger(1234567)).toBe("Ledger 1,234,567");
    });
  });
});
