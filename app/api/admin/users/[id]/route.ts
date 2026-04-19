import { NextRequest, NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { getAdminUser } from "@/lib/admin/users-service";
import { ApiClientError } from "@/lib/api/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdminApi();
    const { id } = await params;
    const user = await getAdminUser(id);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Unexpected error." } }, { status: 500 });
  }
}
