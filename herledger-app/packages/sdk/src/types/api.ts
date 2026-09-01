// ---------------------------------------------------------------------------
// Shared API response envelope — mirrors `apps/web/lib/api/envelope.ts`
// but as pure TypeScript types for SDK consumers and API clients.
// All HerLedger routes return `{ data, error, meta }` on success or
// `{ error: { code, message } }` on failure, with `meta` carrying
// pagination or request metadata when relevant.
// ---------------------------------------------------------------------------

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  pagination?: {
    offset: number;
    limit: number;
    count: number;
  };
}

export type ApiResponse<T> =
  | {
      data: T;
      error: null;
      meta?: ApiMeta | null;
    }
  | {
      data: null;
      error: ApiError;
      meta?: ApiMeta | null;
    };

/**
 * Convenience for the error-only shape `{ error: { code, message } }`
 * used by some routes when `data` is absent. Equivalent to
 * `ApiResponse<never>` with `data: null`.
 */
export type ApiErrorResponse = {
  error: ApiError;
  data?: null;
  meta?: ApiMeta | null;
};
