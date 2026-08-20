import { z } from "zod";

import { createResponseSchema, type SuccessData } from "@/lib/api/envelope";

// Mirrors the on-chain args of the create_attestation call this follows
// (see CreateAttestationForm): eventId/attesterAddress/claimHash are
// BytesN<32>/Address values the client already computed to build that
// transaction, and are re-sent here (rather than re-derived server-side)
// so this route can create the Attestation row itself if the indexer
// hasn't synced it yet -- see route.ts for why.
export const RequestSchema = z.object({
  eventId: z.string().length(64),
  attesterAddress: z.string().min(56).max(56),
  claimHash: z.string().length(64),
  claimDescription: z.string().min(1).max(2000),
  /** Ledger sequence from the confirmed create_attestation transaction result. */
  ledgerSequence: z.number().int().min(0).default(0),
});
export type ClaimDescriptionRequest = z.input<typeof RequestSchema>;

const ClaimDescriptionDataSchema = z.object({
  attestationId: z.string(),
});

export const ResponseSchema = createResponseSchema(ClaimDescriptionDataSchema);
export type ClaimDescriptionResponse = z.infer<typeof ResponseSchema>;
export type ClaimDescriptionData = SuccessData<typeof ResponseSchema>;
