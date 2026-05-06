import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listTransactions } from "@/lib/transactions/service";

export async function GET(request: Request) {
  try {
    const { userId } = await assertUserApi();
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const result = await listTransactions(userId, limit, offset, ["admin_credit", "admin_debit"]);
    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch transactions." } },
      { status: 500 },
    );
  }
}
