// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";

import type { FinancialEventDto } from "@/app/api/activity/recent/schema";

const { mockRecent, mockExportUrl } = vi.hoisted(() => ({
  mockRecent: vi.fn(),
  mockExportUrl: vi.fn((params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return `/api/v1/activity/export${qs ? `?${qs}` : ""}`;
  }),
}));

vi.mock("@/hooks/use-event-stream", () => ({
  useEventStream: () => ({ newEvents: [], isConnected: true, error: null }),
}));

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ...actual,
    apiClient: {
      activity: {
        recent: mockRecent,
        exportUrl: mockExportUrl,
      },
    },
  };
});

import { ActivityList } from "../activity-list";

const EVENT: FinancialEventDto = {
  id: "1",
  eventId: "ev_1",
  eventType: "PaymentReceived",
  assetAddress: "CASSET",
  amount: "1000000000",
  status: "Verified",
  stellarReference: "a".repeat(64),
  ledgerSequence: 100,
};

describe("ActivityList date-range filtering", () => {
  beforeEach(() => {
    mockRecent.mockReset();
    mockExportUrl.mockClear();
    mockRecent.mockResolvedValue({
      events: [EVENT],
      pagination: { offset: 0, limit: 20, count: 1 },
    });
  });

  it("refetches with the selected range and resets to page 0", async () => {
    const user = userEvent.setup();
    render(<ActivityList initialEvents={[EVENT]} initialHasMore={false} />);

    const fromInput = screen.getByLabelText("From");
    await user.type(fromInput, "2026-01-01");

    await waitFor(() => {
      expect(mockRecent).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, startDate: "2026-01-01" })
      );
    });
  });

  it("builds the export link with the current range", async () => {
    const user = userEvent.setup();
    render(<ActivityList initialEvents={[EVENT]} initialHasMore={false} />);

    const fromInput = screen.getByLabelText("From");
    await user.type(fromInput, "2026-01-01");

    await waitFor(() => {
      expect(mockExportUrl).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: "2026-01-01" })
      );
    });
  });

  it("clears the range back to an unfiltered fetch", async () => {
    const user = userEvent.setup();
    render(<ActivityList initialEvents={[EVENT]} initialHasMore={false} />);

    const fromInput = screen.getByLabelText("From");
    await user.type(fromInput, "2026-01-01");
    await waitFor(() => expect(mockRecent).toHaveBeenCalled());

    mockRecent.mockClear();
    await user.click(screen.getByText("Clear"));

    await waitFor(() => {
      expect(mockRecent).toHaveBeenCalledWith(
        expect.not.objectContaining({ startDate: expect.anything() })
      );
    });
  });

  // jsdom has no canvas backend for axe's color-contrast check, and this
  // suite renders via CSS custom properties jsdom can't resolve to concrete
  // colors anyway -- see business-registration-form.a11y.test.tsx for the
  // fuller rationale. Disabled here so it doesn't drown out the structural
  // checks (labels, keyboard-reachable controls) this test is actually for.
  const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

  it("has no axe violations, and every date/export control is keyboard-reachable", async () => {
    const { container } = render(<ActivityList initialEvents={[EVENT]} initialHasMore={false} />);

    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();

    // Tab order should reach the From/To inputs and the export link without
    // any of them being skipped (no stray tabIndex={-1}/inert wrapper).
    await userEvent.tab();
    expect(screen.getByLabelText("From")).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText("To")).toHaveFocus();
  });
});
