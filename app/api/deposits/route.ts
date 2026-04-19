import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listUserDeposits, submitDeposit } from "@/lib/deposits/service";
import { submitDepositInputSchema } from "@/schemas/deposit";

export async function GET() {
  try {
    const { userId } = await assertUserApi();
    const result = await listUserDeposits(userId);
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
    const input = submitDepositInputSchema.parse(body);
    const deposit = await submitDeposit(userId, input);
    return NextResponse.json({ deposit }, { status: 201 });
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
