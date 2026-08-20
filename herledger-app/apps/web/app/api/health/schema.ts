import { z } from "zod";

import { createResponseSchema, type SuccessData } from "@/lib/api/envelope";

export const RequestSchema = z.object({});
export type HealthRequest = z.input<typeof RequestSchema>;

const RpcEndpointStatusSchema = z.object({
  url: z.string(),
  circuitState: z.enum(["CLOSED", "OPEN", "HALF_OPEN"]),
  failureCount: z.number(),
});

const HealthDataSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  rpc: z.object({
    healthy: z.boolean(),
    activeEndpoint: z.string().nullable(),
    latestLedger: z.number().optional(),
    error: z.string().optional(),
    endpoints: z.array(RpcEndpointStatusSchema),
  }),
});

export const ResponseSchema = createResponseSchema(HealthDataSchema);
export type HealthResponse = z.infer<typeof ResponseSchema>;
export type HealthData = SuccessData<typeof ResponseSchema>;
