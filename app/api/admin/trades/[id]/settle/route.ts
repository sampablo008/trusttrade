import { NextRequest, NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { settleTrade } from "@/lib/admin/trades-service";
import { ApiClientError } from "@/lib/api/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await assertAdminApi();
    const { id } = await params;
    const body = await request.json();

    const trade = await settleTrade(id, body, session.userId);
    return NextResponse.json({ trade });
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Unexpected error." } }, { status: 500 });
  }
}
