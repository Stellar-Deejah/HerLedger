import { z } from "zod";

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ApiErrorShape = z.infer<typeof ApiErrorSchema>;

export const ApiMetaSchema = z
  .object({
    requestId: z.string().optional(),
    timestamp: z.string().optional(),
    pagination: z
      .object({
        offset: z.number(),
        limit: z.number(),
        count: z.number(),
      })
      .optional(),
  })
  .optional()
  .nullable();
export type ApiMetaShape = z.infer<typeof ApiMetaSchema>;

export type EnvelopeShape = {
  data: unknown;
  error: ApiErrorShape | null;
  meta?: ApiMetaShape | null;
};

export function createResponseSchema<DataSchema extends z.ZodTypeAny>(dataSchema: DataSchema) {
  return z.union([
    z.object({ data: dataSchema, error: z.null(), meta: ApiMetaSchema }),
    z.object({ data: z.null(), error: ApiErrorSchema, meta: ApiMetaSchema }),
  ]);
}

export type SuccessData<ResponseSchema extends z.ZodType<EnvelopeShape>> = Extract<
  z.infer<ResponseSchema>,
  { error: null }
>["data"];
