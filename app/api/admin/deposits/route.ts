import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { listAdminDeposits } from "@/lib/deposits/admin-service";
import { adminDepositFiltersSchema } from "@/schemas/deposit";

export async function GET(request: NextRequest) {
  try {
    await assertAdminApi();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = adminDepositFiltersSchema.parse(params);
    const result = await listAdminDeposits(filters);
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
