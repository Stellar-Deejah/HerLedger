import { z } from "zod";

import { createResponseSchema, type SuccessData } from "../../../../lib/api/envelope.js";

export const RequestSchema = z.object({});
export type HealthRequest = z.input<typeof RequestSchema>;

const HealthDataSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  db: z
    .object({
      healthy: z.boolean(),
      latencyMs: z.number().nullable().optional(),
      error: z.string().nullable().optional(),
    })
    .optional(),
  indexer: z
    .object({
      healthy: z.boolean(),
      latencyMs: z.number().nullable().optional(),
      error: z.string().nullable().optional(),
    })
    .optional(),
  version: z.string(),
  rpc: z
    .object({
      healthy: z.boolean(),
      activeEndpoint: z.string().nullable().optional(),
      latestLedger: z.number().optional(),
      error: z.string().nullable().optional(),
      endpoints: z
        .array(
          z.object({
            url: z.string(),
            circuitState: z.string().optional(),
            failureCount: z.number().optional(),
          })
        )
        .optional(),
    })
    .optional(),
});

export const ResponseSchema = createResponseSchema(HealthDataSchema);
export type HealthResponse = z.infer<typeof ResponseSchema>;
export type HealthData = SuccessData<typeof ResponseSchema>;
