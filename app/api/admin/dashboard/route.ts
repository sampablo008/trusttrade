import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { getBusinessDashboard } from "@/lib/admin/config-service";
import { ApiClientError } from "@/lib/api/client";

export async function GET() {
  try {
    await assertAdminApi();
    const dashboard = await getBusinessDashboard();
    return NextResponse.json(dashboard);
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Unexpected error." } }, { status: 500 });
  }
}
