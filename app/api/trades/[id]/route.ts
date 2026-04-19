import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getTradeById } from "@/lib/trades/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await assertUserApi();
    const trade = await getTradeById(userId, id);
    return Response.json({ data: trade });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "TRADE_FETCH_FAILED", message: "Failed to fetch trade." } },
      { status: 500 },
    );
  }
}
