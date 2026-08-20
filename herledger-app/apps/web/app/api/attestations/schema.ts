import { z } from "zod";

import { createResponseSchema, type SuccessData } from "@/lib/api/envelope";

// ---------------------------------------------------------------------------
// Query params for GET /api/attestations
//
// An attester may revoke a previously-issued attestation; defaulting to
// Active-only keeps the endpoint from misleading callers about the current
// verified state of their events. `includeRevoked=true` is an explicit
// opt-in for callers that need the full history (e.g. an audit view).
//
// Accepts either a real boolean (from apiClient callers normalizing before
// building the query string) or the "true"/"false" string it becomes on the
// wire (from URLSearchParams on the server) -- both parse to the same
// boolean via transform.
// ---------------------------------------------------------------------------
export const RequestSchema = z.object({
  includeRevoked: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .default(false)
    .transform((val) => (typeof val === "boolean" ? val : val === "true")),
});
export type AttestationsRequest = z.input<typeof RequestSchema>;

export const AttestationSchema = z.object({
  id: z.string(),
  attestationId: z.string(),
  eventId: z.string(),
  attesterAddress: z.string(),
  claimHash: z.string(),
  claimDescription: z.string().nullable(),
  status: z.enum(["Active", "Revoked"]),
  ledgerSequence: z.number(),
});
export type AttestationDto = z.infer<typeof AttestationSchema>;

const AttestationsDataSchema = z.object({
  attestations: z.array(AttestationSchema),
});

export const ResponseSchema = createResponseSchema(AttestationsDataSchema);
export type AttestationsResponse = z.infer<typeof ResponseSchema>;
export type AttestationsData = SuccessData<typeof ResponseSchema>;
