import type { z } from "zod";

import {
  RequestSchema as ActivityRecentRequestSchema,
  ResponseSchema as ActivityRecentResponseSchema,
  type ActivityRecentRequest,
  type ActivityRecentData,
} from "@/app/api/activity/recent/schema";
import {
  RequestSchema as AttestationsRequestSchema,
  ResponseSchema as AttestationsResponseSchema,
  type AttestationsRequest,
  type AttestationsData,
} from "@/app/api/attestations/schema";
import {
  RequestSchema as BusinessRegisterRequestSchema,
  ResponseSchema as BusinessRegisterResponseSchema,
  type BusinessRegisterRequest,
  type BusinessRegisterData,
} from "@/app/api/business/register/schema";
import { ResponseSchema as HealthResponseSchema, type HealthData } from "@/app/api/health/schema";
import {
  RequestSchema as ActivitySummaryRequestSchema,
  ResponseSchema as ActivitySummaryResponseSchema,
  type ActivitySummaryRequest,
  type ActivitySummaryData,
} from "@/app/api/v1/activity/summary/schema";

import type { EnvelopeShape } from "./envelope";
import { ApiRequestError, ApiValidationError } from "./errors";

function toQueryString(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      usp.set(key, String(value));
    }
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

async function request<ResponseSchema extends z.ZodType<EnvelopeShape>>(
  path: string,
  responseSchema: ResponseSchema,
  init?: RequestInit
): Promise<Extract<z.infer<ResponseSchema>, { error: null }>["data"]> {
  const res = await fetch(path, init);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiRequestError(
      "INVALID_JSON",
      "Server returned a response that was not valid JSON",
      res.status
    );
  }

  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiValidationError(
      `Response from ${path} did not match the expected schema`,
      parsed.error.issues
    );
  }

  const envelope = parsed.data;
  if (envelope.error) {
    throw new ApiRequestError(envelope.error.code, envelope.error.message, res.status);
  }

  return envelope.data;
}

export const apiClient = {
  activity: {
    recent: async (params: ActivityRecentRequest = {}): Promise<ActivityRecentData> => {
      const normalized = ActivityRecentRequestSchema.parse(params);
      const qs = toQueryString(normalized);
      return request(`/api/v1/activity/recent${qs}`, ActivityRecentResponseSchema);
    },
    summary: async (params: ActivitySummaryRequest = {}): Promise<ActivitySummaryData> => {
      const normalized = ActivitySummaryRequestSchema.parse(params);
      const qs = toQueryString(normalized);
      return request(`/api/v1/activity/summary${qs}`, ActivitySummaryResponseSchema);
    },
    /** Not a `request()` call: this URL is meant to be navigated to directly so the browser saves the streamed CSV, not fetched and parsed as JSON. */
    exportUrl: (params: { startDate?: string; endDate?: string } = {}): string => {
      const qs = toQueryString(params);
      return `/api/v1/activity/export${qs}`;
    },
  },

  attestations: {
    list: async (params: AttestationsRequest = {}): Promise<AttestationsData> => {
      const normalized = AttestationsRequestSchema.parse(params);
      const qs = toQueryString(normalized);
      return request(`/api/v1/attestations${qs}`, AttestationsResponseSchema);
    },
  },

  business: {
    register: async (body: BusinessRegisterRequest): Promise<BusinessRegisterData> => {
      const normalized = BusinessRegisterRequestSchema.parse(body);
      return request("/api/v1/business/register", BusinessRegisterResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
    },
  },

  health: {
    check: async (): Promise<HealthData> => {
      return request("/api/v1/health", HealthResponseSchema);
    },
  },
};

export { ApiRequestError, ApiValidationError } from "./errors";
