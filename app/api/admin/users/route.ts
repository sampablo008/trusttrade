import { NextRequest, NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { listAdminUsers } from "@/lib/admin/users-service";
import { adminUserFiltersSchema } from "@/schemas/admin";
import { ApiClientError } from "@/lib/api/client";

export async function GET(request: NextRequest) {
  try {
    await assertAdminApi();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = adminUserFiltersSchema.parse(params);

    const result = await listAdminUsers(filters.search, filters.limit, filters.offset);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Unexpected error." } }, { status: 500 });
  }
}
