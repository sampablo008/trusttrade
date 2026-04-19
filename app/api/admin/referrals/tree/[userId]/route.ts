import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { getUserReferralTreeForAdmin } from "@/lib/referrals/admin-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await assertAdminApi();
    const { userId } = await params;
    const sp = request.nextUrl.searchParams;
    const limit = Number(sp.get("limit") ?? 200);
    const offset = Number(sp.get("offset") ?? 0);
    const result = await getUserReferralTreeForAdmin(userId, limit, offset);
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
