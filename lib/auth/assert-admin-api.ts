import "server-only";
import { ApiClientError } from "@/lib/api/client";
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

  // Admin login is cookie-based; Supabase has no matching auth session.
  // Service-role writes don't need a real user context, so use the Supabase
  // user id only when one exists — otherwise fall back to the preview id.
  try {
    const client = await createSupabaseServerClient();
    const { data } = await client.auth.getUser();
    if (data?.user?.id) {
      return { ...session, userId: data.user.id };
    }
  } catch {
    // no supabase session available — fall through
  }

  return { ...session, userId: PREVIEW_ADMIN_ID };
};
