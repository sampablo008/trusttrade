import { NextRequest, NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { bulkSettleTrades } from "@/lib/admin/trades-service";
import { ApiClientError } from "@/lib/api/client";

export async function POST(request: NextRequest) {
  try {
    const session = await assertAdminApi();
    const body = await request.json();

    const result = await bulkSettleTrades(body, session.userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Unexpected error." } }, { status: 500 });
  }
}
