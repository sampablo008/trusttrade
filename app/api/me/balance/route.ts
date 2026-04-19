import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getBalance } from "@/lib/trades/service";

export async function GET() {
  try {
    const { userId } = await assertUserApi();
    const balance = await getBalance(userId);
    return Response.json({ data: balance });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "BALANCE_FETCH_FAILED", message: "Failed to fetch balance." } },
      { status: 500 },
    );
  }
}
