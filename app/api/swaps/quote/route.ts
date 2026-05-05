import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { quoteSwap } from "@/lib/swaps/service";
import { swapQuoteInputSchema } from "@/schemas/swap";

export async function POST(request: NextRequest) {
  try {
    await assertUserApi();
    const body = await request.json();
    const input = swapQuoteInputSchema.parse(body);
    const quote = await quoteSwap(input);
    return NextResponse.json({ data: quote });
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
