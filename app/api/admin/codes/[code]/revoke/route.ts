import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { revokeInviteCode } from "@/lib/invites/admin-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    await assertAdminApi();

    const { code } = await params;
    const result = await revokeInviteCode(code);

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
          code: "INVITE_REVOKE_FAILED",
          message: error instanceof Error ? error.message : "Invite revoke failed.",
        },
      },
      { status: 400 },
    );
  }
}
