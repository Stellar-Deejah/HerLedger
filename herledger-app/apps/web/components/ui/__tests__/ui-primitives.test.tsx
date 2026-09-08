import { NextIntlClientProvider } from "next-intl";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";

import messages from "../../../messages/en.json";
import { EmptyState } from "../empty-state";
import { ErrorMessage } from "../error-message";
import { FormField, Field } from "../form-field";
import {
  ActivityListSkeleton,
  AttestationListSkeleton,
  OverviewSkeleton,
} from "../loading-skeletons";
import { LoadingSpinner } from "../loading-spinner";
import { SkeletonBlock, SkeletonRow, SkeletonCard, SkeletonTable } from "../skeleton";
import { StatusBadge } from "../status-badge";
import { SubmitButton } from "../submit-button";

/**
 * StatusBadge / LoadingSpinner / SubmitButton resolve their labels through
 * next-intl's useTranslations, so they need a provider carrying the English
 * catalog (the same messages the app ships for the default locale).
 */
function WithIntl({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("Design System UI Components & Primitives", () => {
  describe("EmptyState", () => {
    it("renders title and optional description with token styles", () => {
      const html = renderToString(
        <EmptyState title="No Records" description="Please add some records" />
      );
      expect(html).toContain("No Records");
      expect(html).toContain("Please add some records");
      expect(html).toContain("var(--border)");
      expect(html).toContain("var(--radius-md)");
    });
  });

  describe("ErrorMessage", () => {
    it("renders with role alert and semantic error tokens", () => {
      const html = renderToString(<ErrorMessage message="Submission failed" />);
      expect(html).toContain("Submission failed");
      expect(html).toContain('role="alert"');
      expect(html).toContain("var(--color-error-bg)");
      expect(html).toContain("var(--color-error-text)");
      expect(html).toContain("var(--color-error-border)");
    });
  });

  describe("LoadingSpinner", () => {
    it("renders status role, spinning element, and screen-reader label", () => {
      const html = renderToString(
        <WithIntl>
          <LoadingSpinner label="Fetching data…" />
        </WithIntl>
      );
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Fetching data…"');
      expect(html).toContain("Fetching data…");
      expect(html).toContain("var(--color-brand)");
    });

    it("defaults the label to the locale's loading message", () => {
      const html = renderToString(
        <WithIntl>
          <LoadingSpinner />
        </WithIntl>
      );
      expect(html).toContain("Loading…");
      expect(html).toContain('aria-label="Loading…"');
    });
  });

  describe("StatusBadge", () => {
    it("renders semantic status badges including Revoked matching error color tokens", () => {
      const revokedHtml = renderToString(
        <WithIntl>
          <StatusBadge status="Revoked" />
        </WithIntl>
      );
      expect(revokedHtml).toContain("Revoked");
      expect(revokedHtml).toContain("var(--color-error-bg)");
      expect(revokedHtml).toContain("var(--color-error-text)");

      const verifiedHtml = renderToString(
        <WithIntl>
          <StatusBadge status="Verified" />
        </WithIntl>
      );
      expect(verifiedHtml).toContain("Verified");
      expect(verifiedHtml).toContain("var(--color-success-bg)");
      expect(verifiedHtml).toContain("var(--color-success-text)");

      const pendingHtml = renderToString(
        <WithIntl>
          <StatusBadge status="Pending" />
        </WithIntl>
      );
      expect(pendingHtml).toContain("Pending");
      expect(pendingHtml).toContain("var(--color-warning-bg)");

      const disputedHtml = renderToString(
        <WithIntl>
          <StatusBadge status="Disputed" />
        </WithIntl>
      );
      expect(disputedHtml).toContain("Disputed");
      expect(disputedHtml).toContain("var(--color-disputed-bg)");
    });
  });

  describe("SubmitButton", () => {
    it("renders normal, loading, and disabled states with tokens", () => {
      const normalHtml = renderToString(
        <WithIntl>
          <SubmitButton>Save</SubmitButton>
        </WithIntl>
      );
      expect(normalHtml).toContain("Save");
      expect(normalHtml).toContain("var(--color-brand)");

      const loadingHtml = renderToString(
        <WithIntl>
          <SubmitButton loading>Save</SubmitButton>
        </WithIntl>
      );
      expect(loadingHtml).toContain("Please wait…");
      expect(loadingHtml).toContain('aria-busy="true"');
      expect(loadingHtml).toContain("disabled");

      const disabledHtml = renderToString(
        <WithIntl>
          <SubmitButton disabled>Save</SubmitButton>
        </WithIntl>
      );
      expect(disabledHtml).toContain("disabled");
      expect(disabledHtml).toContain("var(--color-muted-text)");
    });
  });

  describe("Field.* Composable Primitives & FormField", () => {
    it("renders FormField convenience wrapper with label, input, hint, and error", () => {
      const html = renderToString(
        <FormField
          id="email-field"
          label="Email Address"
          type="email"
          value="test@example.com"
          onChange={() => {}}
          required
          description="Enter work email"
          error="Email is invalid"
        />
      );
      expect(html).toContain('for="email-field"');
      expect(html).toContain("Email Address");
      expect(html).toContain("*");
      expect(html).toContain('id="email-field"');
      expect(html).toContain('type="email"');
      expect(html).toContain('value="test@example.com"');
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain("Email is invalid");
      expect(html).toContain('role="alert"');
      expect(html).toContain("var(--color-error)");
    });

    it("renders compound Field.* components in custom layout", () => {
      const html = renderToString(
        <Field.Root id="custom-field" required error="Field error">
          <Field.Label>Custom Label</Field.Label>
          <Field.Input value="123" onChange={() => {}} />
          <Field.Hint>Helper info</Field.Hint>
          <Field.Error />
        </Field.Root>
      );
      expect(html).toContain('for="custom-field"');
      expect(html).toContain("Custom Label");
      expect(html).toContain('id="custom-field"');
      expect(html).toContain('value="123"');
      expect(html).toContain("Field error");
      expect(html).toContain('role="alert"');
    });
  });

  describe("Skeleton", () => {
    it("SkeletonBlock renders as an aria-hidden, reduced-motion-aware pulse block", () => {
      const html = renderToString(<SkeletonBlock width="50%" height="1rem" />);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("skeleton");
      expect(html).toContain("width:50%");
      expect(html).toContain("height:1rem");
    });

    it("SkeletonRow renders one block per column", () => {
      const html = renderToString(<SkeletonRow widths={["30%", "20%", "10%"]} />);
      expect(html).toContain('aria-hidden="true"');
      // Three blocks with the supplied widths, and no focusable children.
      const blockCount = html.match(/class="skeleton"/g)?.length ?? 0;
      expect(blockCount).toBe(3);
      expect(html).toContain("width:30%");
      expect(html).toContain("width:10%");
    });

    it("SkeletonCard renders a bordered card with a title bar and lines", () => {
      const html = renderToString(<SkeletonCard lines={3} />);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("var(--border)");
      expect(html).toContain("border-radius:var(--radius)");
    });

    it("SkeletonTable renders a header row plus the requested data rows", () => {
      const html = renderToString(<SkeletonTable rows={4} columns={4} />);
      expect(html).toContain('aria-hidden="true"');
      // Header + 4 rows = 5 flex rows, each with 4 columns.
      const blockCount = html.match(/class="skeleton"/g)?.length ?? 0;
      expect(blockCount).toBe(20);
      expect(html).toContain("border-bottom:2px solid var(--border)");
    });
  });

  describe("Composite loading skeletons", () => {
    it("OverviewSkeleton matches the dashboard spatial layout and is aria-hidden", () => {
      const html = renderToString(<OverviewSkeleton />);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("var(--border)");
      // Four KPI card frames plus the recent-activity table rows.
      expect(html.match(/class="skeleton"/g)?.length ?? 0).toBeGreaterThan(10);
    });

    it("ActivityListSkeleton mirrors the date-range controls and table", () => {
      const html = renderToString(<ActivityListSkeleton />);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("width:8rem");
      expect(html).toContain("var(--border)");
    });

    it("AttestationListSkeleton renders a stack of bordered cards", () => {
      const html = renderToString(<AttestationListSkeleton cards={2} />);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("border-radius:var(--radius)");
    });
  });
});
