import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getProfile, updateProfile } from "@/lib/trades/service";
import { updateProfileInputSchema } from "@/schemas/trade";

export async function GET() {
  try {
    const { userId } = await assertUserApi();
    const profile = await getProfile(userId);
    return Response.json({ data: profile });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "PROFILE_FETCH_FAILED", message: "Failed to fetch profile." } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await assertUserApi();
    const body = await request.json();
    const input = updateProfileInputSchema.parse(body);
    const profile = await updateProfile(userId, input);
    return Response.json({ data: profile });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "PROFILE_UPDATE_FAILED", message: "Failed to update profile." } },
      { status: 500 },
    );
  }
}
