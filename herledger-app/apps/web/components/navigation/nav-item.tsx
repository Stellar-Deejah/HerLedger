"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavHref } from "./nav-items";

// ---------------------------------------------------------------------------
// One navigation link, isolated in its own Client Component boundary so a
// route change re-renders only this item (and not the surrounding nav shell,
// which is a Server Component). Each item calls `usePathname()` independently.
// ---------------------------------------------------------------------------

export function NavItem({ href, label }: { href: NavHref; label: string }) {
  const pathname = usePathname();
  const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

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
