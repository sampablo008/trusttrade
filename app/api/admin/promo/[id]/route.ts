import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { updatePromoSlot } from "@/lib/promo/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdminApi();
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const slot = await updatePromoSlot(id, body);
    return Response.json({ data: slot });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update promo slot." } },
      { status: 500 },
    );
  }
}
