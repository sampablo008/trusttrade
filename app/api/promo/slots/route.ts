import { listPromoSlots } from "@/lib/promo/service";

export async function GET() {
  try {
    const result = await listPromoSlots(true);
    return Response.json({ data: result });
  } catch {
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch promo slots." } },
      { status: 500 },
    );
  }
}
