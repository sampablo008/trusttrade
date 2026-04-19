import type { NextRequest } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { inviteValidationQuerySchema } from "@/schemas/invites";
import { validateInviteCode } from "@/lib/invites/service";

export async function GET(request: NextRequest) {
  try {
    const query = inviteValidationQuerySchema.parse({
      code: request.nextUrl.searchParams.get("code"),
    });
    const invite = await validateInviteCode(query.code);

    return Response.json({ data: invite });
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
          code: "INVITE_VALIDATE_BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invite validation failed.",
        },
      },
      { status: 400 },
    );
  }
}
