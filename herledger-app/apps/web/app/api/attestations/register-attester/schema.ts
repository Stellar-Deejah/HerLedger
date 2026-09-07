import { z } from "zod";

import { createResponseSchema, type SuccessData } from "@/lib/api/envelope";

// `walletAddress` and `metadataHash` mirror the shapes already used for
// on-chain identifiers elsewhere in this API (see business/register/schema.ts):
// a Stellar G... strkey is always 56 chars, and a BytesN<32> hash is always
// 64 hex chars. `txHash` is trusted proof that the on-chain
// AttestationRegistry.register_attester call already succeeded -- this
// route only persists the off-chain display profile, it does not itself
// call the contract (see AttesterRegistrationForm for why: register_attester
// requires the protocol admin's Freighter signature, which can only be
// produced client-side).
export const RequestSchema = z.object({
  walletAddress: z.string().min(56).max(56),
  displayName: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  metadataHash: z.string().length(64),
  txHash: z.string().min(1),
});
export type AttesterRegisterRequest = z.input<typeof RequestSchema>;

const AttesterRegisterDataSchema = z.object({
  walletAddress: z.string(),
});

export const ResponseSchema = createResponseSchema(AttesterRegisterDataSchema);
export type AttesterRegisterResponse = z.infer<typeof ResponseSchema>;
export type AttesterRegisterData = SuccessData<typeof ResponseSchema>;
