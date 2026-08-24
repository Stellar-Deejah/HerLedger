import type { z } from "zod";

/** Thrown when the server's `{ error }` envelope is populated. */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

/** Thrown when a response body doesn't match the expected Zod schema. */
export class ApiValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = "ApiValidationError";
    this.issues = issues;
  }
}
