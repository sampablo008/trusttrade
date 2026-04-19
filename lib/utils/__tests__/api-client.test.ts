import { describe, expect, it } from "vitest";
import { ApiClientError, createApiEnvelopeSchema } from "../../api/client";
import { z } from "zod";

describe("ApiClientError", () => {
  it("sets name to ApiClientError", () => {
    const err = new ApiClientError("bad request", 400, "INVALID_INPUT");
    expect(err.name).toBe("ApiClientError");
  });

  it("inherits from Error", () => {
    const err = new ApiClientError("oops", 500);
    expect(err instanceof Error).toBe(true);
  });

  it("stores status + code", () => {
    const err = new ApiClientError("forbidden", 403, "FORBIDDEN");
    expect(err.status).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("defaults code to UNKNOWN_ERROR", () => {
    const err = new ApiClientError("oops", 500);
    expect(err.code).toBe("UNKNOWN_ERROR");
  });
});

describe("createApiEnvelopeSchema", () => {
  const itemSchema = z.object({ id: z.string() });
  const envelopeSchema = createApiEnvelopeSchema(itemSchema);

  it("accepts a valid data payload", () => {
    const result = envelopeSchema.safeParse({ data: { id: "abc" } });
    expect(result.success).toBe(true);
  });

  it("accepts an error payload without data", () => {
    const result = envelopeSchema.safeParse({
      error: { code: "NOT_FOUND", message: "not found" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload where data fails its schema", () => {
    const result = envelopeSchema.safeParse({ data: { id: 123 } });
    expect(result.success).toBe(false);
  });

  it("accepts empty payload (both optional)", () => {
    const result = envelopeSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
