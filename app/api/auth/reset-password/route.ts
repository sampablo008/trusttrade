import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiClientError } from "@/lib/api/client";
import { confirmPasswordReset } from "@/lib/auth/password-reset-service";

const clientIp = (req: NextRequest): string | null => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await confirmPasswordReset(body, { requestIp: clientIp(request) });
    return NextResponse.json({ data: result });
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: err.issues[0]?.message ?? "Invalid input.",
          },
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unexpected error." } },
      { status: 500 },
    );
  }
}
