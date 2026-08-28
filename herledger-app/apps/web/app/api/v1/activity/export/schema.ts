import { z } from "zod";

export const RequestSchema = z.object({
  /** Inclusive lower bound on `FinancialEvent.createdAt` (`YYYY-MM-DD`). */
  startDate: z.iso.date().optional(),
  /** Inclusive upper bound on `FinancialEvent.createdAt` (`YYYY-MM-DD`). */
  endDate: z.iso.date().optional(),
});
export type ActivityExportRequest = z.input<typeof RequestSchema>;
