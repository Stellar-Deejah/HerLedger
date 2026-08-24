import { z } from "zod";

import { FinancialEventSchema } from "@/app/api/activity/recent/schema";
import { createResponseSchema, type SuccessData } from "@/lib/api/envelope";

export const RequestSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type AttestableEventsRequest = z.input<typeof RequestSchema>;

const PaginationSchema = z.object({
  offset: z.number(),
  limit: z.number(),
  count: z.number(),
});

const AttestableEventsDataSchema = z.object({
  events: z.array(FinancialEventSchema),
  pagination: PaginationSchema,
});

export const ResponseSchema = createResponseSchema(AttestableEventsDataSchema);
export type AttestableEventsResponse = z.infer<typeof ResponseSchema>;
export type AttestableEventsData = SuccessData<typeof ResponseSchema>;
