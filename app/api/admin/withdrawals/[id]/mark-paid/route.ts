import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { listAdminWithdrawals, markWithdrawalPaid } from "@/lib/withdrawals/admin-service";
import { adminMarkPaidSchema } from "@/schemas/withdrawal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await assertAdminApi();
    const { id } = await params;
    const body = await request.json();
    const { txHash, addressConfirm } = adminMarkPaidSchema.parse(body);

    // Fetch the withdrawal to get the destination address for confirmation check
    const list = await listAdminWithdrawals({ limit: 1, offset: 0 });
    // In live mode, fetch directly; in preview the list gives preview data
    const withdrawal = list.items.find((w) => w.id === id);
    const destinationAddress = withdrawal?.destinationAddress ?? "";

    const updated = await markWithdrawalPaid(id, userId, txHash, addressConfirm, destinationAddress);
    return NextResponse.json({ withdrawal: updated });
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
