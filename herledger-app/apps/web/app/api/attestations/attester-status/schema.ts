import { z } from "zod";

import { createResponseSchema, type SuccessData } from "@/lib/api/envelope";

export const RequestSchema = z.object({
  walletAddress: z.string().min(56).max(56),
});
export type AttesterStatusRequest = z.input<typeof RequestSchema>;

const AttesterStatusDataSchema = z.object({
  isAttester: z.boolean(),
  displayName: z.string().nullable(),
});

export const ResponseSchema = createResponseSchema(AttesterStatusDataSchema);
export type AttesterStatusResponse = z.infer<typeof ResponseSchema>;
export type AttesterStatusData = SuccessData<typeof ResponseSchema>;
