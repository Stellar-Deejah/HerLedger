import type { EventStatus, PaginatedResult, PaginationOptions } from "../types.js";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Normalizes offset and limit parameters to safe ranges.
 */
export function clampPagination(
  options?: PaginationOptions,
  defaultLimit = DEFAULT_PAGE_SIZE,
  maxLimit = MAX_PAGE_SIZE
): { offset: number; limit: number } {
  const rawOffset = options?.offset ?? 0;
  const rawLimit = options?.limit ?? defaultLimit;

  const offset = Math.max(0, Math.floor(rawOffset));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(rawLimit)));

  return { offset, limit };
}

/**
 * Paginates an in-memory array slice with metadata.
 */
export function paginateArray<T>(items: T[], options?: PaginationOptions): PaginatedResult<T> {
  const { offset, limit } = clampPagination(options);
  const total = items.length;
  const pagedItems = items.slice(offset, offset + limit);

  return {
    items: pagedItems,
    pagination: {
      offset,
      limit,
      count: pagedItems.length,
      total,
    },
  };
}

/**
 * Utility to compute cursor pagination boundaries for queries.
 */
export function buildCursorPagination<T extends { id: string }>(
  rows: T[],
  pageSize: number
): { items: T[]; nextCursor: string | null; hasMore: boolean } {
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.id : null;

  return { items, nextCursor, hasMore };
}

/**
 * Filters a list of event objects by status.
 */
export function filterEventsByStatus<T extends { status: EventStatus }>(
  events: T[],
  status?: EventStatus | EventStatus[]
): T[] {
  if (!status) {
    return events;
  }

  if (Array.isArray(status)) {
    const statusSet = new Set(status);
    return events.filter((e) => statusSet.has(e.status));
  }

  return events.filter((e) => e.status === status);
}
