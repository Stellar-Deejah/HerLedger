/**
 * Projection utility for API response field-level access control / data minimisation.
 * Given an object and an allowlist of fields, returns a new object containing only
 * the specified allowed fields.
 */
export function projectFields<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  allowedFields: K[]
): Pick<T, K> {
  const projected = {} as Pick<T, K>;
  if (!obj || typeof obj !== "object") {
    return projected;
  }
  for (const field of allowedFields) {
    if (field in obj && obj[field] !== undefined) {
      projected[field] = obj[field];
    }
  }
  return projected;
}
