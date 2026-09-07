import { NextIntlClientProvider } from "next-intl";

import messages from "../../messages/en.json";

/**
 * Wraps components that resolve strings through next-intl's useTranslations
 * with the English catalog so they render standalone in tests.
 * `locale="en"` matches the default locale, so locale-aware links and router
 * pushes keep their unprefixed hrefs.
 */
export function WithIntl({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
