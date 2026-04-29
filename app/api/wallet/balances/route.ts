import { NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getWalletBalances } from "@/lib/wallet-balances/service";

export async function GET() {
  try {
    const { userId } = await assertUserApi();
    const result = await getWalletBalances(userId);
    return NextResponse.json({ data: result });
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
