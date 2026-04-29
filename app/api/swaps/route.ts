import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { executeSwap, listUserSwaps } from "@/lib/swaps/service";
import { executeSwapInputSchema } from "@/schemas/swap";

export async function GET() {
  try {
    const { userId } = await assertUserApi();
    const result = await listUserSwaps(userId);
    return NextResponse.json(result);
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await assertUserApi();
    const body = await request.json();
    const input = executeSwapInputSchema.parse(body);
    const swap = await executeSwap(userId, input);
    return NextResponse.json({ data: swap }, { status: 201 });
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
