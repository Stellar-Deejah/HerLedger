/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

import { ResponseSchema as ActivityRecentResponseSchema } from "../../app/api/v1/activity/recent/schema.js";
import { ResponseSchema as ActivitySummaryResponseSchema } from "../../app/api/v1/activity/summary/schema.js";
import { ResponseSchema as AttestationsResponseSchema } from "../../app/api/v1/attestations/schema.js";
import { ResponseSchema as BusinessRegisterResponseSchema } from "../../app/api/v1/business/register/schema.js";
import { ResponseSchema as HealthResponseSchema } from "../../app/api/v1/health/schema.js";

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

export function buildWebOpenApiSpec() {
  const ApiErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
  });

  const GenericErrorResponseSchema = z.object({
    data: z.null(),
    error: ApiErrorSchema,
  });

  const DisputeSchema = z.object({
    id: z.string(),
    eventId: z.string(),
    status: z.string(),
    reasonPlaintext: z.string(),
    reasonHash: z.string(),
    submittedAt: z.string(),
    resolvedAt: z.string().nullable(),
    resolutionTxHash: z.string().nullable(),
  });

  const DisputeResponseSchema = z.object({
    data: z.object({ dispute: DisputeSchema }),
    error: z.null(),
  });

  const DisputeCreateResponseSchema = z.object({
    data: z.object({ id: z.string() }),
    error: z.null(),
  });

  const ResyncResponseSchema = z.object({
    data: z.object({
      attestation: z.record(z.string(), z.unknown()),
    }),
    error: z.null(),
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "HerLedger Web API",
      version: "1.0.0",
      description: "Next.js REST and SSE API for HerLedger client applications.",
    },
    servers: [{ url: "/" }],
    paths: {
      "/api/v1/health": {
        get: {
          summary: "Health check",
          description: "Returns application API health status.",
          responses: {
            "200": {
              description: "API is healthy",
              content: {
                "application/json": {
                  schema: zodToOpenApi(HealthResponseSchema),
                },
              },
            },
          },
        },
      },
      "/api/v1/activity/recent": {
        get: {
          summary: "Recent activity",
          description: "Fetches recent financial events with pagination.",
          parameters: [
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
            {
              name: "startDate",
              in: "query",
              required: false,
              description: "Inclusive lower bound on FinancialEvent.createdAt (YYYY-MM-DD).",
              schema: { type: "string", format: "date" },
            },
            {
              name: "endDate",
              in: "query",
              required: false,
              description: "Inclusive upper bound on FinancialEvent.createdAt (YYYY-MM-DD).",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            "200": {
              description: "List of recent activity events",
              content: {
                "application/json": {
                  schema: zodToOpenApi(ActivityRecentResponseSchema),
                },
              },
            },
          },
        },
      },
      "/api/v1/activity/summary": {
        get: {
          summary: "Financial KPI summary",
          description:
            "Returns total received, total sent, net balance, and event counts by status for the authenticated business, optionally scoped to a date range.",
          parameters: [
            {
              name: "startDate",
              in: "query",
              required: false,
              description: "Inclusive lower bound on FinancialEvent.createdAt (YYYY-MM-DD).",
              schema: { type: "string", format: "date" },
            },
            {
              name: "endDate",
              in: "query",
              required: false,
              description: "Inclusive upper bound on FinancialEvent.createdAt (YYYY-MM-DD).",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            "200": {
              description: "Financial KPI summary",
              content: {
                "application/json": {
                  schema: zodToOpenApi(ActivitySummaryResponseSchema),
                },
              },
            },
          },
        },
      },
      "/api/v1/activity/export": {
        get: {
          summary: "Export activity as CSV",
          description:
            "Streams every FinancialEvent for the authenticated business (optionally date-filtered) as a CSV file.",
          parameters: [
            {
              name: "startDate",
              in: "query",
              required: false,
              description: "Inclusive lower bound on FinancialEvent.createdAt (YYYY-MM-DD).",
              schema: { type: "string", format: "date" },
            },
            {
              name: "endDate",
              in: "query",
              required: false,
              description: "Inclusive upper bound on FinancialEvent.createdAt (YYYY-MM-DD).",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            "200": {
              description: "CSV export of matching financial events",
              content: {
                "text/csv": {
                  schema: { type: "string" },
                },
              },
            },
          },
        },
      },
      "/api/v1/attestations": {
        get: {
          summary: "List attestations",
          description: "Returns attestations with optional filter for revoked attestations.",
          parameters: [
            {
              name: "includeRevoked",
              in: "query",
              required: false,
              schema: { type: "boolean", default: false },
            },
          ],
          responses: {
            "200": {
              description: "List of attestations",
              content: {
                "application/json": {
                  schema: zodToOpenApi(AttestationsResponseSchema),
                },
              },
            },
          },
        },
      },
      "/api/v1/attestations/{attestationId}/resync": {
        post: {
          summary: "Resync attestation",
          description: "Triggers on-chain state resynchronization for a specific attestation.",
          parameters: [
            {
              name: "attestationId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Resync outcome",
              content: {
                "application/json": {
                  schema: zodToOpenApi(ResyncResponseSchema),
                },
              },
            },
          },
        },
      },
      "/api/v1/business/register": {
        post: {
          summary: "Register business",
          description: "Registers a business profile with on-chain transaction reference.",
          requestBody: {
            content: {
              "application/json": {
                schema: zodToOpenApi(
                  z.object({
                    businessId: z.string().length(64),
                    walletAddress: z.string().min(56).max(56),
                    displayName: z.string().min(1).max(200),
                    metadataHash: z.string().length(64),
                    txHash: z.string().min(1),
                  })
                ),
              },
            },
          },
          responses: {
            "200": {
              description: "Business registration successful",
              content: {
                "application/json": {
                  schema: zodToOpenApi(BusinessRegisterResponseSchema),
                },
              },
            },
          },
        },
      },
      "/api/v1/disputes": {
        post: {
          summary: "Create dispute",
          description: "Submits a dispute against a financial event.",
          requestBody: {
            content: {
              "application/json": {
                schema: zodToOpenApi(
                  z.object({
                    eventId: z.string().min(1).max(64),
                    reason: z.string().min(1).max(2000),
                    reasonHash: z.string().length(64),
                  })
                ),
              },
            },
          },
          responses: {
            "200": {
              description: "Dispute recorded",
              content: {
                "application/json": {
                  schema: zodToOpenApi(DisputeCreateResponseSchema),
                },
              },
            },
          },
        },
      },
      "/api/v1/disputes/{eventId}": {
        get: {
          summary: "Get dispute details",
          description: "Returns decrypted dispute details for a financial event if authorized.",
          parameters: [
            {
              name: "eventId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Dispute details",
              content: {
                "application/json": {
                  schema: zodToOpenApi(DisputeResponseSchema),
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
            "403": {
              description: "Forbidden",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
            "404": {
              description: "Not found",
              content: {
                "application/json": {
                  schema: zodToOpenApi(GenericErrorResponseSchema),
                },
              },
            },
          },
        },
      },
      "/api/v1/events/stream": {
        get: {
          summary: "Server-Sent Events (SSE) financial stream",
          description: "Streams financial event updates in real time via SSE.",
          responses: {
            "200": {
              description: "Event stream (text/event-stream)",
              content: {
                "text/event-stream": {
                  schema: { type: "string" },
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
        GenericErrorResponse: zodToOpenApi(GenericErrorResponseSchema),
        HealthResponse: zodToOpenApi(HealthResponseSchema),
        ActivityRecentResponse: zodToOpenApi(ActivityRecentResponseSchema),
        ActivitySummaryResponse: zodToOpenApi(ActivitySummaryResponseSchema),
        AttestationsResponse: zodToOpenApi(AttestationsResponseSchema),
        BusinessRegisterResponse: zodToOpenApi(BusinessRegisterResponseSchema),
      },
    },
  };
}
