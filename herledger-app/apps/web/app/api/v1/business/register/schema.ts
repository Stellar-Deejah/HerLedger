import { z } from "zod";

import { createResponseSchema, type SuccessData } from "../../../../../lib/api/envelope.js";

export const RequestSchema = z.object({
  businessId: z.string().length(64),
  walletAddress: z.string().min(56).max(56),
  displayName: z.string().min(1).max(200),
  metadataHash: z.string().length(64),
  txHash: z.string().min(1),
});
export type BusinessRegisterRequest = z.input<typeof RequestSchema>;

const BusinessRegisterDataSchema = z.object({
  businessId: z.string(),
});

export const ResponseSchema = createResponseSchema(BusinessRegisterDataSchema);
export type BusinessRegisterResponse = z.infer<typeof ResponseSchema>;
export type BusinessRegisterData = SuccessData<typeof ResponseSchema>;
