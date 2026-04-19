import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { cancelTrade } from "@/lib/trades/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await assertUserApi();
    const result = await cancelTrade(userId, id);
    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "CANCEL_TRADE_FAILED", message: "Failed to cancel trade." } },
      { status: 500 },
    );
  }
}
