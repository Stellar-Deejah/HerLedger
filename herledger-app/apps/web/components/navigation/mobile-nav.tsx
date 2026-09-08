"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { NavItem } from "./nav-item";
import { NAV_ITEMS } from "./nav-items";
import { Notifications } from "./notifications";
import { SignOutButton } from "./sign-out-button";

// ---------------------------------------------------------------------------
// Mobile navigation: a top bar with a hamburger trigger that opens a slide-in
// drawer. Hidden on desktop (>= 768px) via the `nav-mobile-bar` CSS class.
//
// The open state is derived from the route: we remember the pathname that was
// active when the drawer opened, and treat the drawer as open only while that
// pathname still matches the current route. Navigating therefore closes the
// drawer automatically, without a setState-in-effect.
// ---------------------------------------------------------------------------

export function MobileNav() {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);

  const open = openPathname === pathname;

  return (
    <>
      <header className="nav-mobile-bar">
        <button
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          onClick={() => setOpenPathname(open ? null : pathname)}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.25rem",
            color: "inherit",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <span style={{ fontWeight: 700, fontSize: "1rem" }}>HerLedger</span>

        <span style={{ marginLeft: "auto" }}>
          <Notifications />
        </span>
      </header>

      {open && (
        <div
          className="nav-mobile-backdrop"
          onClick={() => setOpenPathname(null)}
          aria-hidden="true"
        />
      )}

      <nav
        id="mobile-nav-drawer"
        className={open ? "nav-mobile-drawer nav-mobile-drawer--open" : "nav-mobile-drawer"}
        aria-label="Dashboard navigation"
        inert={!open}
      >
        <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
          {NAV_ITEMS.map(({ href, label }) => (
            <li key={href}>
              <NavItem href={href} label={label} />
            </li>
          ))}
        </ul>
        <SignOutButton />
      </nav>
    </>
  );
}
