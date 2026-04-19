import { z } from "zod";

const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export const createApiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.optional(),
    error: apiErrorSchema.optional(),
  });

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "UNKNOWN_ERROR",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export const fetchJson = async <T>(
  input: RequestInfo | URL,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const payload = await response
    .json()
    .catch(() => ({ error: { code: "INVALID_JSON", message: "Response was not valid JSON." } }));

  const envelope = createApiEnvelopeSchema(schema).parse(payload);

  if (!response.ok || envelope.error) {
    const error = envelope.error ?? {
      code: "REQUEST_FAILED",
      message: "The request failed.",
      details: payload,
    };

    throw new ApiClientError(error.message, response.status, error.code, error.details);
  }

  if (!envelope.data) {
    throw new ApiClientError("Response did not include a data payload.", response.status);
  }

  return envelope.data;
};
