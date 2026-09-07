// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { axe } from "vitest-axe";

import type { ActivitySummaryData } from "@/app/api/v1/activity/summary/schema";

import { KpiSummary } from "../kpi-summary";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

describe("KpiSummary", () => {
  it("formats totals as decimals and shows counts by status", () => {
    const summary: ActivitySummaryData = {
      totalReceived: "1005000000",
      totalSent: "2000000",
      netBalance: "1003000000",
      countByStatus: { Pending: 1, Verified: 2, Disputed: 0, Revoked: 0 },
    };

    render(<KpiSummary summary={summary} />);

    expect(screen.getByText("Total received")).toBeInTheDocument();
    expect(screen.getByText("100.5000000")).toBeInTheDocument();
    expect(screen.getByText("0.2000000")).toBeInTheDocument();
    expect(screen.getByText("100.3000000")).toBeInTheDocument();
  });

  it("marks a negative net balance as a deficit rather than a plain amount", () => {
    const summary: ActivitySummaryData = {
      totalReceived: "1000000",
      totalSent: "5000000",
      netBalance: "-4000000",
      countByStatus: { Pending: 0, Verified: 0, Disputed: 0, Revoked: 0 },
    };

    render(<KpiSummary summary={summary} />);

    expect(screen.getByText(/deficit/)).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const summary: ActivitySummaryData = {
      totalReceived: "0",
      totalSent: "0",
      netBalance: "0",
      countByStatus: { Pending: 0, Verified: 0, Disputed: 0, Revoked: 0 },
    };

    const { container } = render(<KpiSummary summary={summary} />);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });
});
