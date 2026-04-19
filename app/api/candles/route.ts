import type { NextRequest } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { listCandles } from "@/lib/markets/service";
import { publicCandlesQuerySchema } from "@/schemas/market";

export async function GET(request: NextRequest) {
  try {
    const query = publicCandlesQuerySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      symbol: request.nextUrl.searchParams.get("symbol") ?? undefined,
      tf: request.nextUrl.searchParams.get("tf") ?? undefined,
    });
    const result = await listCandles(query);

    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        {
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: {
          code: "MARKET_CANDLES_BAD_REQUEST",
          message: error instanceof Error ? error.message : "Candle fetch failed.",
        },
      },
      { status: 400 },
    );
  }
}
