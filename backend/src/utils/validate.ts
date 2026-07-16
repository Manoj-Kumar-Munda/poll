import { type z } from "zod";

import { ApiError } from "@/utils/ApiError.js";

export const validate = async <TSchema extends z.ZodType>(
  payload: unknown,
  schema: TSchema,
): Promise<z.infer<TSchema>> => {
  const result = await schema.safeParseAsync(payload);

  if (!result.success) {
    throw new ApiError(
      400,
      "Validation failed",
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return result.data;
};
