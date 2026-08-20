import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { EmptyState } from "../empty-state";
import { ErrorMessage } from "../error-message";
import { FormField, Field } from "../form-field";
import { LoadingSpinner } from "../loading-spinner";
import { StatusBadge } from "../status-badge";
import { SubmitButton } from "../submit-button";

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
      const html = renderToString(<LoadingSpinner label="Fetching data…" />);
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Fetching data…"');
      expect(html).toContain("Fetching data…");
      expect(html).toContain("var(--color-brand)");
    });
  });

  describe("StatusBadge", () => {
    it("renders semantic status badges including Revoked matching error color tokens", () => {
      const revokedHtml = renderToString(<StatusBadge status="Revoked" />);
      expect(revokedHtml).toContain("Revoked");
      expect(revokedHtml).toContain("var(--color-error-bg)");
      expect(revokedHtml).toContain("var(--color-error-text)");

      const verifiedHtml = renderToString(<StatusBadge status="Verified" />);
      expect(verifiedHtml).toContain("Verified");
      expect(verifiedHtml).toContain("var(--color-success-bg)");
      expect(verifiedHtml).toContain("var(--color-success-text)");

      const pendingHtml = renderToString(<StatusBadge status="Pending" />);
      expect(pendingHtml).toContain("Pending");
      expect(pendingHtml).toContain("var(--color-warning-bg)");

      const disputedHtml = renderToString(<StatusBadge status="Disputed" />);
      expect(disputedHtml).toContain("Disputed");
      expect(disputedHtml).toContain("var(--color-disputed-bg)");
    });
  });

  describe("SubmitButton", () => {
    it("renders normal, loading, and disabled states with tokens", () => {
      const normalHtml = renderToString(
        <SubmitButton>Save</SubmitButton>
      );
      expect(normalHtml).toContain("Save");
      expect(normalHtml).toContain("var(--color-brand)");

      const loadingHtml = renderToString(
        <SubmitButton loading>Save</SubmitButton>
      );
      expect(loadingHtml).toContain("Please wait…");
      expect(loadingHtml).toContain('aria-busy="true"');
      expect(loadingHtml).toContain("disabled");

      const disabledHtml = renderToString(
        <SubmitButton disabled>Save</SubmitButton>
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
});
