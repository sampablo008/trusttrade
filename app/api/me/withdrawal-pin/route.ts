import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiClientError } from "@/lib/api/client";
import { loadAccountIdentity } from "@/lib/account/profile-lookup";
import { setOrChangeWithdrawalPin } from "@/lib/account/pin-service";
import { assertUserApi } from "@/lib/auth/assert-user-api";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await assertUserApi();
    const identity = await loadAccountIdentity(userId);
    const body = await request.json();

    const result = await setOrChangeWithdrawalPin(
      {
        userId,
        email: identity.email,
      },
      body,
    );

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
