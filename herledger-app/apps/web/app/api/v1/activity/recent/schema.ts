import { z } from "zod";

import { createResponseSchema, type SuccessData } from "../../../../../lib/api/envelope.js";

export const RequestSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ActivityRecentRequest = z.input<typeof RequestSchema>;

export const FinancialEventSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventType: z.enum(["PaymentReceived", "PaymentSent", "InvoiceSettled", "CommitmentFulfilled"]),
  assetAddress: z.string(),
  amount: z.string(), // i128 travels as a decimal string over JSON
  status: z.enum(["Pending", "Verified", "Disputed", "Revoked"]),
  stellarReference: z.string(),
  ledgerSequence: z.number(),
  createdAt: z.string(), // ISO 8601 timestamp of when the event was indexed
});
export type FinancialEventDto = z.infer<typeof FinancialEventSchema>;

const PaginationSchema = z.object({
  offset: z.number(),
  limit: z.number(),
  count: z.number(),
});

const ActivityRecentDataSchema = z.object({
  events: z.array(FinancialEventSchema),
  pagination: PaginationSchema,
});

export const ResponseSchema = createResponseSchema(ActivityRecentDataSchema);
export type ActivityRecentResponse = z.infer<typeof ResponseSchema>;
export type ActivityRecentData = SuccessData<typeof ResponseSchema>;
