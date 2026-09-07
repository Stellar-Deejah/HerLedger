import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { MARKETING_ROUTES, SITE_URL } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return MARKETING_ROUTES.flatMap((route) =>
    routing.locales.map((locale) => {
      // `localePrefix: "as-needed"` keeps the default locale at the root and
      // prefixes the rest (/es/), so URLs are stable for English users.
      const path = locale === routing.defaultLocale ? route.path : `/${locale}${route.path}`;
      const languages = Object.fromEntries(
        routing.locales.map((l) => [
          l,
          `${SITE_URL}${l === routing.defaultLocale ? route.path : `/${l}${route.path}`}`,
        ])
      );

      return {
        url: `${SITE_URL}${path}`,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      };
    })
  );
}
