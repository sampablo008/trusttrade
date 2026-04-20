import { NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { loadAccountIdentity } from "@/lib/account/profile-lookup";

export async function GET() {
  try {
    const { userId } = await assertUserApi();
    const identity = await loadAccountIdentity(userId);

    return NextResponse.json({
      data: {
        hasWithdrawalPin: identity.hasWithdrawalPin,
        emailVerified: identity.emailVerified,
      },
    });
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unexpected error." } },
      { status: 500 },
    );
  }
}
