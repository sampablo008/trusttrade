import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getSignupBonusStatus } from "@/lib/bonus/service";

export async function GET() {
  try {
    const { userId } = await assertUserApi();
    const result = await getSignupBonusStatus(userId);
    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "BONUS_STATUS_FAILED", message: "Failed to read bonus status." } },
      { status: 500 },
    );
  }
}
