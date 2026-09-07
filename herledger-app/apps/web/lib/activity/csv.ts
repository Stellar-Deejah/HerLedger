import type { FinancialEvent } from "@prisma/client";

import { formatAmount } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// CSV formatting for the activity export. Kept separate from the route
// handler so the row/escaping logic can be unit-tested without spinning up
// a ReadableStream or a mock database.
// ---------------------------------------------------------------------------

export const CSV_COLUMNS = [
  "id",
  "eventId",
  "eventType",
  "assetAddress",
  "amount",
  "status",
  "stellarReference",
  "ledgerSequence",
  "createdAt",
] as const;

export const CSV_HEADER_ROW = CSV_COLUMNS.join(",") + "\r\n";

/**
 * RFC 4180 field escaping: wrap in double quotes (doubling any embedded
 * quote) only when the field contains a comma, quote, or newline -- an
 * unquoted plain field is more readable and this is what every other CSV
 * this endpoint's consumers open in already expects.
 */
export function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * One CSV row per `FinancialEvent`: amount formatted as a decimal (matching
 * the UI, not raw stroops) and `createdAt` as ISO 8601, per the acceptance
 * criteria for human-readable export fields.
 */
export function financialEventToCsvRow(event: FinancialEvent): string {
  return (
    [
      event.id,
      event.eventId,
      event.eventType,
      event.assetAddress,
      formatAmount(BigInt(event.amount)),
      event.status,
      event.stellarReference,
      String(event.ledgerSequence),
      event.createdAt.toISOString(),
    ]
      .map(csvEscape)
      .join(",") + "\r\n"
  );
}
