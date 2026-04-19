import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listUserWithdrawals, requestWithdrawal } from "@/lib/withdrawals/service";
import { requestWithdrawalInputSchema } from "@/schemas/withdrawal";

export async function GET() {
  try {
    const { userId } = await assertUserApi();
    const result = await listUserWithdrawals(userId);
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
    const input = requestWithdrawalInputSchema.parse(body);
    const withdrawal = await requestWithdrawal(userId, input);
    return NextResponse.json({ withdrawal }, { status: 201 });
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
