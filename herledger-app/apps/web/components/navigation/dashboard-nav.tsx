"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEventStream } from "@/hooks/use-event-stream";
import { signOut } from "@/lib/auth/client";
import { formatAmount } from "@/lib/utils/format";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/business", label: "Business" },
  { href: "/dashboard/attestations", label: "Attestations" },
  { href: "/dashboard/disputes", label: "Disputes" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export function DashboardNav({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  const pathname = usePathname();
  const { newEvents, clearNewEvents } = useEventStream();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Clear notifications when visiting the activity page
    if (pathname === "/dashboard/activity") {
      clearNewEvents();
    }
  }, [pathname, clearNewEvents]);

  const unreadCount = newEvents.length;

  return (
    <nav
      aria-label="Dashboard navigation"
      style={{
        width: "220px",
        minHeight: "100vh",
        borderRight: "1px solid var(--border)",
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        flexShrink: 0,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          position: "relative",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "1rem",
            padding: "0.25rem 0.5rem",
          }}
        >
          HerLedger
        </span>

        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            position: "relative",
            padding: "0.25rem",
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

      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
        {NAV_ITEMS.map(({ href, label }) => {
          const requiresBusiness = href === "/dashboard/attestations" || href === "/dashboard/disputes";
          const disabled = requiresBusiness && !onboardingCompleted;
          const isActive =
            href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <li key={href}>
              {disabled ? (
                <span
                  aria-disabled="true"
                  title="Register your business to unlock this feature"
                  style={{
                    display: "block", padding: "0.5rem 0.75rem", borderRadius: "var(--radius)",
                    color: "var(--muted)", opacity: 0.55, cursor: "not-allowed", fontSize: "0.9375rem",
                  }}
                >
                  {label} <span aria-hidden="true">🔒</span>
                </span>
              ) : (
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "block",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius)",
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? "var(--muted-bg)" : "transparent",
                  color: isActive ? "var(--foreground)" : "var(--muted)",
                  textDecoration: "none",
                  fontSize: "0.9375rem",
                }}
              >
                {label}
              </Link>
              )}
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => void signOut()}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "0.5rem 0.75rem",
          cursor: "pointer",
          fontSize: "0.875rem",
          color: "var(--muted)",
          textAlign: "left",
          width: "100%",
        }}
        type="button"
      >
        Sign out
      </button>
    </nav>
  );
}
