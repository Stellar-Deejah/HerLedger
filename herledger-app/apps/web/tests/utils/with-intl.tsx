import { NextIntlClientProvider } from "next-intl";

import messages from "../../messages/en.json";

interface WithIntlProps {
  /** Locale to render with. Defaults to "en" (the app's default locale). */
  locale?: string;
  children: React.ReactNode;
}

/**
 * Wraps components that resolve strings through next-intl's useTranslations
 * with the English catalog so they render standalone in tests.
 * `locale="en"` matches the default locale, so locale-aware links and router
 * pushes keep their unprefixed hrefs.
 */
export function WithIntl({ locale = "en", children }: WithIntlProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
