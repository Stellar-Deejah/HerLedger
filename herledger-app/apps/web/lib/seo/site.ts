/**
 * Canonical site URL used to build absolute URLs for metadata, Open Graph
 * tags, robots.txt, and sitemap.xml.
 *
 * `APP_URL` is already a required, validated server env var (see
 * `packages/config/src/schema.ts`) used elsewhere for the same purpose
 * (e.g. Better Auth's `baseURL`/`trustedOrigins`). We read it directly from
 * `process.env` here rather than through `getServerEnv()` so that metadata
 * generation doesn't pull in the full server env schema (database, Stellar
 * network, auth secrets, etc.) for a concern that only needs one URL. The
 * production fallback keeps `next build` and static analysis working even
 * when `APP_URL` isn't set (e.g. isolated tooling runs).
 */
export const SITE_URL = process.env.APP_URL ?? "https://herledger.app";

/** Public marketing routes that should be listed in sitemap.xml. */
export const MARKETING_ROUTES: ReadonlyArray<{
  path: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}> = [{ path: "/", changeFrequency: "weekly", priority: 1 }];
