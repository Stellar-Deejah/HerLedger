// ---------------------------------------------------------------------------
// Shared date-range parsing for activity endpoints (recent activity, KPI
// summary, CSV export). Query params carry `YYYY-MM-DD` calendar dates --
// what a native `<input type="date">` produces -- rather than full
// datetimes, so there's one unambiguous rule for turning a day into the
// UTC instants it filters against, instead of each caller re-deriving it
// (and risking off-by-one-day boundaries) independently.
// ---------------------------------------------------------------------------

/**
 * `startDate` becomes UTC midnight of that day: the first instant that day
 * could have a matching `createdAt`.
 */
export function startOfDayUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/**
 * `endDate` becomes the last UTC instant of that day, so the range is
 * inclusive of every event recorded during it.
 */
export function endOfDayUtc(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

export interface DateRangeParams {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Convert optional `YYYY-MM-DD` request params into the `{ startDate,
 * endDate }` shape the db-layer repositories expect, omitting bounds that
 * weren't provided.
 */
export function toDateRange(params: { startDate?: string; endDate?: string }): DateRangeParams {
  return {
    ...(params.startDate ? { startDate: startOfDayUtc(params.startDate) } : {}),
    ...(params.endDate ? { endDate: endOfDayUtc(params.endDate) } : {}),
  };
}
