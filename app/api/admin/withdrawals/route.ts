import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { listAdminWithdrawals } from "@/lib/withdrawals/admin-service";
import { adminWithdrawalFiltersSchema } from "@/schemas/withdrawal";

export async function GET(request: NextRequest) {
  try {
    await assertAdminApi();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = adminWithdrawalFiltersSchema.parse(params);
    const result = await listAdminWithdrawals(filters);
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
