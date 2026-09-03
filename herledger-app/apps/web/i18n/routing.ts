import { defineRouting } from "next-intl/routing";

/**
 * Locale routing configuration.
 *
 * `localePrefix: "as-needed"` keeps the default locale (English) at the root
 * (`/dashboard`) while prefixing alternate locales (`/es/dashboard`). This
 * avoids churning every existing URL and preserves the app's current public
 * links.
 */
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: string | undefined): value is Locale {
  return typeof value === "string" && routing.locales.includes(value as Locale);
}
