import { describe, expect, it } from "vitest";

import type { EventStatus } from "../types.js";
import {
  buildCursorPagination,
  clampPagination,
  filterEventsByStatus,
  paginateArray,
} from "../utils/pagination.js";

describe("Pagination and Filtering Utilities", () => {
  describe("clampPagination", () => {
    it("clamps negative or undefined offsets and limits to safe values", () => {
      expect(clampPagination()).toEqual({ offset: 0, limit: 20 });
      expect(clampPagination({ offset: -5, limit: -10 })).toEqual({ offset: 0, limit: 1 });
      expect(clampPagination({ offset: 10, limit: 500 }, 20, 100)).toEqual({
        offset: 10,
        limit: 100,
      });
    });
  });

  describe("paginateArray", () => {
    it("paginates array items with metadata", () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = paginateArray(items, { offset: 2, limit: 3 });

      expect(result.items).toEqual([3, 4, 5]);
      expect(result.pagination).toEqual({
        offset: 2,
        limit: 3,
        count: 3,
        total: 10,
      });
    });
  });

  describe("buildCursorPagination", () => {
    it("handles single-page and multi-page cursor boundary generation", () => {
      const rows = [
        { id: "id-1", name: "A" },
        { id: "id-2", name: "B" },
        { id: "id-3", name: "C" },
      ];

      const singlePage = buildCursorPagination(rows, 5);
      expect(singlePage.items).toHaveLength(3);
      expect(singlePage.nextCursor).toBeNull();
      expect(singlePage.hasMore).toBe(false);

      const multiPage = buildCursorPagination(rows, 2);
      expect(multiPage.items).toHaveLength(2);
      expect(multiPage.nextCursor).toBe("id-2");
      expect(multiPage.hasMore).toBe(true);
    });
  });

  describe("filterEventsByStatus", () => {
    const events: { id: string; status: EventStatus }[] = [
      { id: "1", status: "Pending" },
      { id: "2", status: "Verified" },
      { id: "3", status: "Disputed" },
      { id: "4", status: "Revoked" },
    ];

    it("filters by single status", () => {
      const verified = filterEventsByStatus(events, "Verified");
      expect(verified).toHaveLength(1);
      expect(verified[0]?.id).toBe("2");
    });

    it("filters by array of statuses", () => {
      const active = filterEventsByStatus(events, ["Verified", "Pending"]);
      expect(active).toHaveLength(2);
    });

    it("returns all events when no status filter is provided", () => {
      expect(filterEventsByStatus(events)).toEqual(events);
    });
  });
});
