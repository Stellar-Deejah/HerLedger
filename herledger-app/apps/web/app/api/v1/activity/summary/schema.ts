import { z } from "zod";

import { createResponseSchema, type SuccessData } from "../../../../../lib/api/envelope.js";

export const RequestSchema = z.object({
  /** Inclusive lower bound on `FinancialEvent.createdAt` (`YYYY-MM-DD`). */
  startDate: z.iso.date().optional(),
  /** Inclusive upper bound on `FinancialEvent.createdAt` (`YYYY-MM-DD`). */
  endDate: z.iso.date().optional(),
});
export type ActivitySummaryRequest = z.input<typeof RequestSchema>;

const CountByStatusSchema = z.object({
  Pending: z.number(),
  Verified: z.number(),
  Disputed: z.number(),
  Revoked: z.number(),
});

const ActivitySummaryDataSchema = z.object({
  // i128-safe decimal strings (raw stroops) -- never cast to Number.
  totalReceived: z.string(),
  totalSent: z.string(),
  netBalance: z.string(),
  countByStatus: CountByStatusSchema,
});

export const ResponseSchema = createResponseSchema(ActivitySummaryDataSchema);
export type ActivitySummaryResponse = z.infer<typeof ResponseSchema>;
export type ActivitySummaryData = SuccessData<typeof ResponseSchema>;
