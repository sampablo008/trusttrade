import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { bulkApproveCommissions } from "@/lib/referrals/admin-service";
import { bulkApproveCommissionsInputSchema } from "@/schemas/referrals";

export async function POST(request: NextRequest) {
  try {
    const session = await assertAdminApi();
    const body = await request.json();
    const input = bulkApproveCommissionsInputSchema.parse(body);
    const result = await bulkApproveCommissions(input.commissionIds, session.userId, input.note);
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
