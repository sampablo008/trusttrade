import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { checkTradeRateLimit } from "@/lib/rate-limit/trades";
import { listActiveTrades, listSettledTrades, placeTrade } from "@/lib/trades/service";
import { listTradesQuerySchema } from "@/schemas/trade";

export async function GET(request: Request) {
  try {
    const { userId } = await assertUserApi();
    const { searchParams } = new URL(request.url);
    const query = listTradesQuerySchema.parse(Object.fromEntries(searchParams));

    if (!query.status || query.status === "active") {
      const result = await listActiveTrades(userId);
      return Response.json({ data: result });
    }

    const result = await listSettledTrades(userId, query.limit, query.offset, query.outcome);
    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "TRADES_LIST_FAILED", message: "Failed to list trades." } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await assertUserApi();
    await checkTradeRateLimit(userId);
    const body = await request.json();
    const result = await placeTrade(userId, body);
    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status },
      );
    }
    console.error("[/api/trades POST] place_trade failed", error);
    const message = error instanceof Error ? error.message : "Failed to place trade.";
    return Response.json(
      { error: { code: "PLACE_TRADE_FAILED", message } },
      { status: 500 },
    );
  }
}
