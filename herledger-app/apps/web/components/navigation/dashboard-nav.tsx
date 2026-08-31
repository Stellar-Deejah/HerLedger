import { MobileNav } from "./mobile-nav";
import { NavItem } from "./nav-item";
import { NAV_ITEMS } from "./nav-items";
import { Notifications } from "./notifications";
import { SignOutButton } from "./sign-out-button";

// ---------------------------------------------------------------------------
// Dashboard navigation shell — a Server Component.
//
// The shell itself never re-renders on client route changes. Each nav item is
// an isolated Client Component (`NavItem`) that calls `usePathname()`
// independently, and the notification bell / sign-out button are likewise
// their own client boundaries, so a route change only re-renders the nav
// items whose active state changed.
//
// Responsive layout is handled in CSS: the `nav-sidebar` is shown from 768px
// up, while `MobileNav` renders the top bar + drawer shown below 768px.
// ---------------------------------------------------------------------------

export function DashboardNav({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  return (
    <>
      <aside className="nav-sidebar" aria-label="Dashboard navigation">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "1rem", padding: "0.25rem 0.5rem" }}>
            HerLedger
          </span>
          <Notifications />
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
          {NAV_ITEMS.map(({ href, label }) => (
            <li key={href}>
            <NavItem href={href} label={label} disabled={!onboardingCompleted && (href === "/dashboard/attestations" || href === "/dashboard/disputes")} />
            </li>
          ))}
        </ul>

        <SignOutButton />
      </aside>

      <MobileNav onboardingCompleted={onboardingCompleted} />
    </>
  );
}
