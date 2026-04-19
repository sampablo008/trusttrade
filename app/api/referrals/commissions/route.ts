import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getMyCommissions } from "@/lib/referrals/service";
import { commissionFiltersSchema } from "@/schemas/referrals";

export async function GET(request: NextRequest) {
  try {
    const session = await assertUserApi();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = commissionFiltersSchema.parse(params);
    const result = await getMyCommissions(
      session.userId,
      filters.limit,
      filters.offset,
      filters.status,
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
