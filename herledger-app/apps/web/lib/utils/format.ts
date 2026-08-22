// ---------------------------------------------------------------------------
// Formatting utilities — amount formatting at the presentation boundary.
// Never use JavaScript Number for large Stellar amounts.
// ---------------------------------------------------------------------------

/**
 * Format a bigint amount for display.
 *
 * Stellar contract amounts are raw i128 values (7 decimal places for stroops
 * by default). The conversion is done entirely with BigInt arithmetic so that
 * amounts up to the maximum i128 (2^127 - 1) are formatted without the
 * precision loss that would result from passing the value through `Number()`.
 *
 * @param amount - Raw integer amount (may be negative, e.g. a sent payment).
 * @param decimals - Number of fractional digits; defaults to 7 (stroops).
 * @returns A string like `"10.0000000"` or `"-1.2345678"`.
 *
 * @example
 * formatAmount(10_000_000n);       // "1.0000000"
 * formatAmount(-12_345_678n);      // "-1.2345678"
 * formatAmount(2n ** 127n - 1n);   // exact i128 max, no precision loss
 */
export function formatAmount(amount: bigint, decimals = 7): string {
  if (decimals === 0) return amount.toString();

  const factor = 10n ** BigInt(decimals);

  // Split the sign off before integer division so both the whole and
  // fractional parts are non-negative — BigInt division truncates toward
  // zero, which would otherwise produce a mangled string for negatives.
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;

  const whole = absolute / factor;
  const fractional = absolute % factor;

  const fractionalStr = fractional.toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${whole}.${fractionalStr}`;
}

/**
 * Truncate a Stellar address or hex ID for display.
 */
export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/**
 * Format a ledger sequence as a human-readable string.
 */
export function formatLedger(sequence: number): string {
  return `Ledger ${sequence.toLocaleString()}`;
}
