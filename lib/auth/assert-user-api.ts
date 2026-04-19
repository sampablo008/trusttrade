import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getAppSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";

export const assertUserApi = async (): Promise<{ userId: string; username: string | null; isAdmin: boolean }> => {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    throw new ApiClientError("Authentication required.", 401, "UNAUTHENTICATED");
  }

  // Preview mode: no real Supabase session
  if (!getOptionalServerEnv()) {
    return { userId: PREVIEW_USER_ID, username: session.username, isAdmin: session.isAdmin };
  }

  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    throw new ApiClientError("Authentication required.", 401, "UNAUTHENTICATED");
  }

  return { userId: user.id, username: session.username, isAdmin: session.isAdmin };
};
