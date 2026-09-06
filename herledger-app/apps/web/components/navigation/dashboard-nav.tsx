"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/business", label: "Business" },
  { href: "/dashboard/attestations", label: "Attestations" },
  { href: "/dashboard/disputes", label: "Disputes" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

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
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: "1rem",
          padding: "0.25rem 0.5rem",
          marginBottom: "1rem",
          display: "block",
        }}
      >
        HerLedger
      </span>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive =
            href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <li key={href}>
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
