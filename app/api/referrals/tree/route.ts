import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getMyReferralTree } from "@/lib/referrals/service";
import { referralTreeFiltersSchema } from "@/schemas/referrals";

export async function GET(request: NextRequest) {
  try {
    const session = await assertUserApi();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = referralTreeFiltersSchema.parse(params);
    const result = await getMyReferralTree(
      session.userId,
      filters.level,
      filters.limit,
      filters.offset,
    );
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
