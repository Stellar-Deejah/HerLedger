import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware navigation. Components should import `Link`, `redirect`,
 * `usePathname`, `useRouter` and `getPathname` from here instead of from
 * `next/link` / `next/navigation` so that the active locale prefix is
 * applied automatically.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
