"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEventStream } from "@/hooks/use-event-stream";
import { formatAmount } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Notification bell + dropdown. Isolated in its own Client Component so the
// nav shell (a Server Component) does not re-render on route changes, and
// this component only re-renders when the event-stream state changes.
// ---------------------------------------------------------------------------

export function Notifications() {
  const { newEvents, clearNewEvents } = useEventStream();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Clear notifications when visiting the activity page.
    if (pathname === "/dashboard/activity") {
      clearNewEvents();
    }
  }, [pathname, clearNewEvents]);

  const unreadCount = newEvents.length;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setShowDropdown((open) => !open)}
        aria-expanded={showDropdown}
        aria-haspopup="true"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "0.25rem",
          color: "inherit",
        }}
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: "var(--danger, red)",
              color: "white",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              fontSize: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            width: "250px",
            background: "var(--background, white)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            zIndex: 50,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "0.5rem 0.75rem",
              borderBottom: "1px solid var(--border)",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            Recent Notifications
          </div>
          {newEvents.length === 0 ? (
            <div
              style={{
                padding: "1rem",
                textAlign: "center",
                fontSize: "0.875rem",
                color: "var(--muted)",
              }}
            >
              No new notifications
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {newEvents.slice(0, 5).map((event) => (
                <li
                  key={event.eventId}
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "0.8125rem",
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{event.eventType}</div>
                  <div style={{ fontFamily: "monospace", marginTop: "0.25rem" }}>
                    {formatAmount(BigInt(event.amount))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
