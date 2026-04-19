import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { listAdminCommissions } from "@/lib/referrals/admin-service";
import { commissionFiltersSchema } from "@/schemas/referrals";

export async function GET(request: NextRequest) {
  try {
    await assertAdminApi();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = commissionFiltersSchema.parse(params);
    const result = await listAdminCommissions(filters);
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
