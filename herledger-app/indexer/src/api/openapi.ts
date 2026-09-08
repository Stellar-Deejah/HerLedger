/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

function zodToOpenApi(schema: any): any {
  if (!schema) return {};

  if (schema._def?.innerType) return zodToOpenApi(schema._def.innerType);
  if (schema._def?.schema) return zodToOpenApi(schema._def.schema);
  if (schema.def?.innerType) return zodToOpenApi(schema.def.innerType);
  if (schema.def?.schema) return zodToOpenApi(schema.def.schema);

  const typeName = schema._def?.typeName || schema.def?.type || schema.constructor?.name;

  if (typeName === "ZodString" || typeName === "string") {
    const res: any = { type: "string" };
    const checks = schema._def?.checks || schema.def?.checks || [];
    for (const c of checks) {
      if (c.kind === "min") res.minLength = c.value;
      if (c.kind === "max") res.maxLength = c.value;
      if (c.kind === "length") {
        res.minLength = c.value;
        res.maxLength = c.value;
      }
      if (c.kind === "regex") res.pattern = c.regex.source;
    }
    return res;
  }

  if (typeName === "ZodNumber" || typeName === "number") {
    const res: any = { type: "number" };
    const checks = schema._def?.checks || schema.def?.checks || [];
    if (checks.some((c: any) => c.kind === "int")) {
      res.type = "integer";
    }
    return res;
  }

  if (typeName === "ZodBoolean" || typeName === "boolean") {
    return { type: "boolean" };
  }

  if (typeName === "ZodNull" || typeName === "null") {
    return { type: "null" };
  }

  if (typeName === "ZodLiteral" || typeName === "literal") {
    const val = schema._def?.value ?? schema.def?.value;
    return { type: typeof val, enum: [val] };
  }

  if (typeName === "ZodEnum" || typeName === "enum") {
    const values = schema._def?.values || schema.def?.values || schema.options || [];
    return { type: "string", enum: Array.from(values) };
  }

  if (typeName === "ZodArray" || typeName === "array") {
    const element = schema._def?.type || schema.def?.element || schema._def?.element;
    return { type: "array", items: zodToOpenApi(element) };
  }

  if (typeName === "ZodObject" || typeName === "object") {
    const shape =
      typeof schema.shape === "function"
        ? schema.shape()
        : schema.shape || schema._def?.shape?.() || schema._def?.shape || schema.def?.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (shape) {
      for (const [key, propSchema] of Object.entries(shape)) {
        properties[key] = zodToOpenApi(propSchema);
        const isOptional =
          (propSchema as any)?._def?.typeName === "ZodOptional" ||
          (propSchema as any)?.def?.type === "optional" ||
          (propSchema as any)?._def?.typeName === "ZodDefault" ||
          (propSchema as any)?.def?.type === "default";
        if (!isOptional) {
          required.push(key);
        }
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  if (typeName === "ZodUnion" || typeName === "union") {
    const options = schema._def?.options || schema.def?.options || [];
    return { oneOf: options.map(zodToOpenApi) };
  }

  if (typeName === "ZodRecord" || typeName === "record") {
    return { type: "object", additionalProperties: true };
  }

  return { type: "object" };
}

export function buildIndexerOpenApiSpec() {
  const ApiErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
  });

  const HealthSuccessSchema = z.object({
    data: z.object({
      status: z.literal("ok"),
      database: z.literal("connected"),
    }),
    error: z.null(),
  });

  const GenericErrorResponseSchema = z.object({
    data: z.null(),
    error: ApiErrorSchema,
  });

  const BusinessProfileSchema = z.object({
    businessId: z.string(),
    walletAddress: z.string(),
    displayName: z.string(),
    metadataHash: z.string(),
    active: z.boolean(),
    createdAt: z.string(),
  });

  const BusinessResponseSchema = z.object({
    data: BusinessProfileSchema,
    error: z.null(),
  });

  const EventsPaginationSchema = z.object({
    data: z.object({
      events: z.array(z.record(z.string(), z.unknown())),
      pagination: z.object({
        offset: z.number(),
        limit: z.number(),
        count: z.number(),
      }),
    }),
    error: z.null(),
  });

  const AttestationsListResponseSchema = z.object({
    data: z.object({
      attestations: z.array(z.record(z.string(), z.unknown())),
    }),
    error: z.null(),
  });

  const IndexerStatusResponseSchema = z.object({
    data: z.object({
      stream: z.string(),
      lastLedger: z.number().nullable(),
      lastCycle: z.record(z.string(), z.unknown()).nullable(),
    }),
    error: z.null(),
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "HerLedger Indexer API",
      version: "1.0.0",
      description: "Fastify REST API exposing indexed blockchain data for HerLedger.",
    },
    servers: [{ url: "/v1" }],
    paths: {
      "/v1/health": {
        get: {
          summary: "Indexer health check",
          description: "Returns indexer health and database connection status.",
          responses: {
            "200": {
              description: "Indexer is healthy",
              content: {
                "application/json": {
                  schema: zodToOpenApi(HealthSuccessSchema),
                },
              },
            },
            "503": {
              description: "Database unavailable",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
          },
        },
      },
      "/v1/businesses/{businessId}": {
        get: {
          summary: "Get business profile",
          description: "Returns indexed business profile data by business ID.",
          parameters: [
            {
              name: "businessId",
              in: "path",
              required: true,
              schema: { type: "string", minLength: 1, maxLength: 64 },
              description: "Business ID",
            },
          ],
          responses: {
            "200": {
              description: "Business profile details",
              content: {
                "application/json": {
                  schema: zodToOpenApi(BusinessResponseSchema),
                },
              },
            },
            "400": {
              description: "Invalid business ID",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
            "404": {
              description: "Business not found",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
          },
        },
      },
      "/v1/businesses/{businessId}/events": {
        get: {
          summary: "Get business financial events",
          description: "Returns paginated financial events for a given business ID.",
          parameters: [
            {
              name: "businessId",
              in: "path",
              required: true,
              schema: { type: "string", minLength: 1, maxLength: 64 },
            },
            {
              name: "offset",
              in: "query",
              required: false,
              schema: { type: "integer", default: 0 },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "Paginated list of financial events",
              content: {
                "application/json": {
                  schema: zodToOpenApi(EventsPaginationSchema),
                },
              },
            },
            "400": {
              description: "Invalid parameters",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
          },
        },
      },
      "/v1/businesses/{businessId}/attestations": {
        get: {
          summary: "Get business attestations",
          description: "Returns all attestations associated with events for a business.",
          parameters: [
            {
              name: "businessId",
              in: "path",
              required: true,
              schema: { type: "string", minLength: 1, maxLength: 64 },
            },
          ],
          responses: {
            "200": {
              description: "List of attestations",
              content: {
                "application/json": {
                  schema: zodToOpenApi(AttestationsListResponseSchema),
                },
              },
            },
            "400": {
              description: "Invalid parameters",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
          },
        },
      },
      "/v1/supported-assets": {
        get: {
          summary: "Supported assets info",
          description: "Read-through endpoint for supported on-chain asset information.",
          responses: {
            "200": {
              description: "Supported assets response",
              content: {
                "application/json": {
                  schema: zodToOpenApi(
                    z.object({
                      data: z.object({ note: z.string() }),
                      error: z.null(),
                    })
                  ),
                },
              },
            },
          },
        },
      },
      "/v1/indexer/status": {
        get: {
          summary: "Indexer status and metrics",
          description: "Returns indexer checkpoint sequence and sync cycle metrics.",
          responses: {
            "200": {
              description: "Indexer status",
              content: {
                "application/json": {
                  schema: zodToOpenApi(IndexerStatusResponseSchema),
                },
              },
            },
          },
        },
      },
      "/v1/transactions/{hash}": {
        get: {
          summary: "Get Stellar transaction",
          description: "Returns indexed Stellar transaction details by transaction hash.",
          parameters: [
            {
              name: "hash",
              in: "path",
              required: true,
              schema: { type: "string", minLength: 64, maxLength: 64 },
            },
          ],
          responses: {
            "200": {
              description: "Transaction details",
              content: {
                "application/json": {
                  schema: zodToOpenApi(
                    z.object({
                      data: z.record(z.string(), z.unknown()),
                      error: z.null(),
                    })
                  ),
                },
              },
            },
            "400": {
              description: "Invalid transaction hash",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
            "404": {
              description: "Transaction not found",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
          },
        },
      },
      "/v1/admin/replay/{errorId}": {
        post: {
          summary: "Replay dead-letter error",
          description: "Retries indexing for a previously failed event by error ID.",
          parameters: [
            {
              name: "errorId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "x-admin-token",
              in: "header",
              required: true,
              schema: { type: "string" },
              description: "Admin authorization token",
            },
          ],
          responses: {
            "200": {
              description: "Replay result",
              content: {
                "application/json": {
                  schema: zodToOpenApi(
                    z.object({
                      data: z.object({
                        errorId: z.string(),
                        outcome: z.unknown(),
                        retryCount: z.number(),
                      }),
                      error: z.null(),
                    })
                  ),
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
            "404": {
              description: "Dead-letter row not found",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
            "409": {
              description: "Already resolved or max retries exceeded",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
            "500": {
              description: "Replay failed",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ApiError: zodToOpenApi(ApiErrorSchema),
        HealthSuccess: zodToOpenApi(HealthSuccessSchema),
        GenericErrorResponse: zodToOpenApi(GenericErrorResponseSchema),
      },
    },
  };
}
