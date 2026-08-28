"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavHref } from "./nav-items";

// ---------------------------------------------------------------------------
// One navigation link, isolated in its own Client Component boundary so a
// route change re-renders only this item (and not the surrounding nav shell,
// which is a Server Component). Each item calls `usePathname()` independently.
// ---------------------------------------------------------------------------

export function NavItem({ href, label, disabled = false }: { href: NavHref; label: string; disabled?: boolean }) {
  const pathname = usePathname();
  const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  if (disabled) {
    return <span aria-disabled="true" title="Register your business to unlock this feature" style={{ display: "block", padding: "0.5rem 0.75rem", borderRadius: "var(--radius)", color: "var(--muted)", opacity: 0.55, cursor: "not-allowed", fontSize: "0.9375rem" }}>{label} <span aria-hidden="true">🔒</span></span>;
  }

  return (
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
  );
}
