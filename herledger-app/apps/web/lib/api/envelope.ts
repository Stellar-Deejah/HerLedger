import { z } from "zod";

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ApiErrorShape = z.infer<typeof ApiErrorSchema>;

export type EnvelopeShape = { data: unknown; error: ApiErrorShape | null };

export function createResponseSchema<DataSchema extends z.ZodTypeAny>(dataSchema: DataSchema) {
  return z.union([
    z.object({ data: dataSchema, error: z.null() }),
    z.object({ data: z.null(), error: ApiErrorSchema }),
  ]);
}

export type SuccessData<ResponseSchema extends z.ZodType<EnvelopeShape>> = Extract<
  z.infer<ResponseSchema>,
  { error: null }
>["data"];
