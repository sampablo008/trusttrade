import { ApiClientError } from "@/lib/api/client";
import { listMarketTokens } from "@/lib/markets/service";

export async function GET() {
  try {
    const result = await listMarketTokens();

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
          code: "MARKET_TOKENS_BAD_REQUEST",
          message: error instanceof Error ? error.message : "Token fetch failed.",
        },
      },
      { status: 400 },
    );
  }
}
