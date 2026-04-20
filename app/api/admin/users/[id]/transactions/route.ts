import { NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { adminTransactionFiltersSchema } from "@/schemas/admin";
import { listTransactions } from "@/lib/transactions/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdminApi();

    const { id } = await params;
    const filters = adminTransactionFiltersSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const result = await listTransactions(id, filters.limit, filters.offset);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch transactions." } },
      { status: 500 },
    );
  }
}
