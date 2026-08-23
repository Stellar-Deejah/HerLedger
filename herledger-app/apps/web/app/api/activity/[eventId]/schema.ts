import { z } from "zod";

import { createResponseSchema, type SuccessData } from "@/lib/api/envelope";

export const FinancialEventDetailSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventType: z.enum(["PaymentReceived", "PaymentSent", "InvoiceSettled", "CommitmentFulfilled"]),
  assetAddress: z.string(),
  amount: z.string(), // i128 travels as a decimal string over JSON
  status: z.enum(["Pending", "Verified", "Disputed", "Revoked"]),
  stellarReference: z.string(),
  metadataHash: z.string(),
  ledgerSequence: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FinancialEventDetailDto = z.infer<typeof FinancialEventDetailSchema>;

export const AttestationDtoSchema = z.object({
  id: z.string(),
  attestationId: z.string(),
  attesterAddress: z.string(),
  claimHash: z.string(),
  claimDescription: z.string().nullable(),
  status: z.enum(["Active", "Revoked"]),
  ledgerSequence: z.number(),
  createdAt: z.string(),
});
export type AttestationDto = z.infer<typeof AttestationDtoSchema>;

// Decrypted -- `reason` is plaintext read back through decryptDisputeReason,
// never the raw `reasonPlaintext` ciphertext envelope column.
export const DisputeDtoSchema = z.object({
  id: z.string(),
  status: z.enum(["Submitted", "Investigating", "Resolved", "Revoked"]),
  reason: z.string(),
  reasonHash: z.string(),
  submittedAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolutionTxHash: z.string().nullable(),
});
export type DisputeDto = z.infer<typeof DisputeDtoSchema>;

export const StellarTransactionDtoSchema = z.object({
  hash: z.string(),
  ledgerSequence: z.number(),
  successful: z.boolean(),
  sourceAddress: z.string(),
});
export type StellarTransactionDto = z.infer<typeof StellarTransactionDtoSchema>;

const ActivityDetailDataSchema = z.object({
  event: FinancialEventDetailSchema,
  attestations: z.array(AttestationDtoSchema),
  disputes: z.array(DisputeDtoSchema),
  // Null when the indexer hasn't written this row yet -- not a foreign-key
  // relation to FinancialEvent.stellarReference, see stellar-transactions.ts.
  stellarTransaction: StellarTransactionDtoSchema.nullable(),
});

export const ResponseSchema = createResponseSchema(ActivityDetailDataSchema);
export type ActivityDetailResponse = z.infer<typeof ResponseSchema>;
export type ActivityDetailData = SuccessData<typeof ResponseSchema>;
