import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { rejectAdminDeposit } from "@/lib/deposits/admin-service";
import { adminRejectDepositSchema } from "@/schemas/deposit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await assertAdminApi();
    const { id } = await params;
    const body = await request.json();
    const { note } = adminRejectDepositSchema.parse(body);
    const deposit = await rejectAdminDeposit(id, userId, note);
    return NextResponse.json({ deposit });
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
