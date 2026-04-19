import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getAppSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  if (!getOptionalServerEnv()) {
    return { ...session, userId: PREVIEW_ADMIN_ID };
  }

  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    throw new ApiClientError("Authentication required.", 401, "UNAUTHORIZED");
  }

  return { ...session, userId: user.id };
};
