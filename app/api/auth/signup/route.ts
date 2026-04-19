import { ApiClientError } from "@/lib/api/client";
import { createInvitedUser } from "@/lib/invites/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await createInvitedUser(payload);

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
          code: "SIGNUP_FAILED",
          message: error instanceof Error ? error.message : "Signup failed.",
        },
      },
      { status: 400 },
    );
  }
}
