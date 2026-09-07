import { describe, it, expect } from "vitest";

import { startOfDayUtc, endOfDayUtc, toDateRange } from "../date-range";

describe("startOfDayUtc / endOfDayUtc", () => {
  it("anchors a calendar date to UTC midnight and the last instant of the day", () => {
    expect(startOfDayUtc("2026-03-15").toISOString()).toBe("2026-03-15T00:00:00.000Z");
    expect(endOfDayUtc("2026-03-15").toISOString()).toBe("2026-03-15T23:59:59.999Z");
  });
});

describe("toDateRange", () => {
  it("omits bounds that weren't provided", () => {
    expect(toDateRange({})).toEqual({});
    expect(toDateRange({ startDate: "2026-01-01" })).toEqual({
      startDate: startOfDayUtc("2026-01-01"),
    });
    expect(toDateRange({ endDate: "2026-01-31" })).toEqual({
      endDate: endOfDayUtc("2026-01-31"),
    });
  });

  it("converts both bounds when both are provided", () => {
    expect(toDateRange({ startDate: "2026-01-01", endDate: "2026-01-31" })).toEqual({
      startDate: startOfDayUtc("2026-01-01"),
      endDate: endOfDayUtc("2026-01-31"),
    });
  });
});
