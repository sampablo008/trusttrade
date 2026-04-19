import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getAppSession } from "@/lib/auth/session";

export const assertAdminApi = async () => {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    throw new ApiClientError("Authentication required.", 401, "UNAUTHORIZED");
  }

  if (!session.isAdmin) {
    throw new ApiClientError("Admin access required.", 403, "FORBIDDEN");
  }

  return session;
};
