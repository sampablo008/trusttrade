import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { listPromoSlots } from "@/lib/promo/service";

export async function GET() {
  try {
    await assertAdminApi();
    const result = await listPromoSlots(false);
    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch promo slots." } },
      { status: 500 },
    );
  }
}
