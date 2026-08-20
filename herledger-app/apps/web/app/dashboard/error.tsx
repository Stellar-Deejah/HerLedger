"use client";

import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Shared error boundary for every /dashboard/* route. The RSC widgets under
// this segment (OverviewPanel, ActivityListServer, AttestationListServer)
// already catch their own data-fetch failures and render inline error
// markup, matching the pre-RSC client components' UX — this is only a
// backstop for genuinely unhandled throws (e.g. a misused redirect() or a
// Prisma connection failure), so it doesn't need per-route granularity.
// ---------------------------------------------------------------------------
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" style={{ padding: "1.5rem" }}>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Something went wrong
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9375rem", marginBottom: "1rem" }}>
        This page couldn&apos;t load. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "0.5rem 1rem",
          cursor: "pointer",
          fontSize: "0.875rem",
        }}
      >
        Try again
      </button>
    </div>
  );
}
