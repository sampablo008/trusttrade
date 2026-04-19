import { type NextRequest, NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { setUserReferralRates } from "@/lib/referrals/admin-service";
import { setRatesInputSchema } from "@/schemas/referrals";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await assertAdminApi();
    const { id } = await params;
    const body = await request.json();
    const input = setRatesInputSchema.parse(body);
    const rates = await setUserReferralRates(id, input, session.userId);
    return NextResponse.json({ rates });
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
