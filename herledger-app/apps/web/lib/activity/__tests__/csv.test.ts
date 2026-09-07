import { describe, it, expect } from "vitest";

import { csvEscape, financialEventToCsvRow, CSV_HEADER_ROW } from "../csv";

describe("csvEscape", () => {
  it("leaves plain values unquoted", () => {
    expect(csvEscape("PaymentReceived")).toBe("PaymentReceived");
  });

  it("quotes and doubles embedded quotes, commas, and newlines", () => {
    expect(csvEscape('has "quotes"')).toBe('"has ""quotes"""');
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("financialEventToCsvRow", () => {
  const event = {
    id: "cuid_1",
    businessId: "biz_1",
    eventId: "ev_1",
    eventType: "PaymentReceived",
    assetAddress: "CASSET",
    amount: "1005000000",
    stellarReference: "ref_1",
    metadataHash: "hash",
    status: "Verified",
    ledgerSequence: 555,
    createdAt: new Date("2026-01-15T12:30:00.000Z"),
    updatedAt: new Date("2026-01-15T12:30:00.000Z"),
  } as never;

  it("formats the amount as a decimal and the date as ISO 8601", () => {
    const row = financialEventToCsvRow(event);
    expect(row).toBe(
      "cuid_1,ev_1,PaymentReceived,CASSET,100.5000000,Verified,ref_1,555,2026-01-15T12:30:00.000Z\r\n"
    );
  });

  it("has a header matching the row's column order", () => {
    expect(CSV_HEADER_ROW).toBe(
      "id,eventId,eventType,assetAddress,amount,status,stellarReference,ledgerSequence,createdAt\r\n"
    );
  });
});
