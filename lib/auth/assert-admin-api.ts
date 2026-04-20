import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getAppSession } from "@/lib/auth/session";
import { getOptionalServerEnv } from "@/lib/env/server";

const PREVIEW_ADMIN_ID = "00000000-0000-4000-8000-0000000000ad";

export const assertAdminApi = async (): Promise<{
  isAdmin: boolean;
  isAuthenticated: boolean;
  userId: string;
  username: string | null;
}> => {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    throw new ApiClientError("Authentication required.", 401, "UNAUTHORIZED");
  }

  if (!session.isAdmin) {
    throw new ApiClientError("Admin access required.", 403, "FORBIDDEN");
  }

  if (session.userId) {
    return {
      isAdmin: session.isAdmin,
      isAuthenticated: session.isAuthenticated,
      userId: session.userId,
      username: session.username,
    };
  }

  if (!getOptionalServerEnv()) {
    return {
      isAdmin: session.isAdmin,
      isAuthenticated: session.isAuthenticated,
      userId: PREVIEW_ADMIN_ID,
      username: session.username,
    };
  }

  throw new ApiClientError("Session missing user id.", 401, "UNAUTHORIZED");
};
