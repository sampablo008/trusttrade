import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { claimSignupBonus } from "@/lib/bonus/service";

export async function POST() {
  try {
    const { userId } = await assertUserApi();
    const result = await claimSignupBonus(userId);
    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status },
      );
    }
    console.error("[/api/bonus/signup/claim] failed", error);
    const message = error instanceof Error ? error.message : "Failed to claim bonus.";
    return Response.json(
      { error: { code: "BONUS_CLAIM_FAILED", message } },
      { status: 500 },
    );
  }
}
