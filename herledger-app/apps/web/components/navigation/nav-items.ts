// Shared, server-safe navigation item definitions. Keeping this in its own
// module lets the Server Component shell and the mobile drawer client
// component render the exact same list without importing client-only code.

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/business", label: "Business" },
  { href: "/dashboard/attestations", label: "Attestations" },
  { href: "/dashboard/disputes", label: "Disputes" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export type NavHref = (typeof NAV_ITEMS)[number]["href"];
