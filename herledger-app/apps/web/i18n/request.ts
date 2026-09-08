import { getRequestConfig } from "next-intl/server";

import { isLocale, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // The `[locale]` segment is passed in as `requestLocale`. It can be
  // undefined on the very first request before the middleware has run, in
  // which case we fall back to the default locale.
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // UTC keeps server/client date rendering consistent: financial event
    // timestamps are stored as UTC instants and there's no per-user
    // timezone preference yet.
    timeZone: "UTC",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
