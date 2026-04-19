import { NextRequest, NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { adjustBalance } from "@/lib/admin/users-service";
import { ApiClientError } from "@/lib/api/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await assertAdminApi();
    const { id } = await params;
    const body = await request.json();

    const user = await adjustBalance(id, body, session.userId);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Unexpected error." } }, { status: 500 });
  }
}
