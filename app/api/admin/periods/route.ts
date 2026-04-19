import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { createAdminTradePeriod, listAdminTradePeriods } from "@/lib/markets/admin-service";

export async function GET() {
  try {
    await assertAdminApi();

    const result = await listAdminTradePeriods();

    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        {
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: {
          code: "ADMIN_PERIODS_BAD_REQUEST",
          message: error instanceof Error ? error.message : "Trade period list failed.",
        },
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await assertAdminApi();

    const payload = await request.json();
    const result = await createAdminTradePeriod(payload);

    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        {
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: {
          code: "ADMIN_PERIOD_CREATE_BAD_REQUEST",
          message: error instanceof Error ? error.message : "Trade period create failed.",
        },
      },
      { status: 400 },
    );
  }
}
