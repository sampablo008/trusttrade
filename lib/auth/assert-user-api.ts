import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getAppSession } from "@/lib/auth/session";
import { getOptionalServerEnv } from "@/lib/env/server";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";

export const assertUserApi = async (): Promise<{
  userId: string;
  username: string | null;
  isAdmin: boolean;
}> => {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    throw new ApiClientError("Authentication required.", 401, "UNAUTHENTICATED");
  }

  if (session.userId) {
    return { userId: session.userId, username: session.username, isAdmin: session.isAdmin };
  }

  if (!getOptionalServerEnv()) {
    return { userId: PREVIEW_USER_ID, username: session.username, isAdmin: session.isAdmin };
  }

  throw new ApiClientError("Session missing user id.", 401, "UNAUTHENTICATED");
};
