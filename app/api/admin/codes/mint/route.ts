import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { mintAdminInviteCodes } from "@/lib/invites/admin-service";

export async function POST(request: Request) {
  try {
    await assertAdminApi();

    const payload = await request.json();
    const result = await mintAdminInviteCodes(payload);

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
          code: "INVITE_MINT_FAILED",
          message: error instanceof Error ? error.message : "Invite mint failed.",
        },
      },
      { status: 400 },
    );
  }
}
