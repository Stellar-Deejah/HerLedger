// ---------------------------------------------------------------------------
// Formatting utilities — amount formatting at the presentation boundary.
// Never use JavaScript Number for large Stellar amounts.
//
// All formatters take the active locale (from next-intl's `useLocale` /
// `getLocale`) and delegate grouping and decimal separators to
// `Intl.NumberFormat` / `Intl.DateTimeFormat`, so amounts and dates render
// with the locale's conventions (e.g. "1,234,567.00" for `en`,
// "1.234.567,00" for `es`, "1 234 567,00" for `fr`).
// ---------------------------------------------------------------------------

/**
 * Format a bigint amount for display.
 * Stellar contract amounts are raw i128 values (7 decimal places for stroops).
 * Returns a string like "10.0000000" — asset symbol must be provided separately.
 *
 * The whole part is grouped with `Intl.NumberFormat` for `locale`; the
 * fractional part is appended verbatim (never rounded) so large i128 values
 * keep exact precision — `Intl.NumberFormat` only formats integer BigInt
 * values, so splitting is required rather than optional.
 */
export function formatAmount(amount: bigint, locale = "en", decimals = 7): string {
  if (decimals === 0) return amount.toString();

  const factor = BigInt(10 ** decimals);
  const whole = amount / factor;
  const fractional = amount % factor;

  const wholeStr = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(whole);
  const fractionalStr = fractional.toString().padStart(decimals, "0");
  return `${wholeStr}.${fractionalStr}`;
}

/**
 * Truncate a Stellar address or hex ID for display.
 */
export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/**
 * Format a ledger sequence as a human-readable string with locale-aware
 * digit grouping (e.g. "Ledger 1,234,567" for `en`, "Ledger 1.234.567" for
 * `es`).
 */
export function formatLedger(sequence: number, locale = "en"): string {
  return `Ledger ${new Intl.NumberFormat(locale).format(sequence)}`;
}

/**
 * Format a date (ISO string or Date) with the active locale's conventions
 * (e.g. "Aug 22, 2026" for `en`, "22 ago 2026" for `es`).
 */
export function formatDate(date: string | Date, locale = "en"): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}
