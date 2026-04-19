import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getAppSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";

export const assertUserApi = async (): Promise<{ userId: string; username: string | null; isAdmin: boolean }> => {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    throw new ApiClientError("Authentication required.", 401, "UNAUTHENTICATED");
  }

  // App login is cookie-based; Supabase Auth isn't wired up yet. When a real
  // Supabase session exists we use it, otherwise fall back to the preview id
  // so service-role writes can still persist data.
  try {
    const client = await createSupabaseServerClient();
    const { data } = await client.auth.getUser();
    if (data?.user?.id) {
      return { userId: data.user.id, username: session.username, isAdmin: session.isAdmin };
    }
  } catch {
    // no supabase session available — fall through
  }

  return { userId: PREVIEW_USER_ID, username: session.username, isAdmin: session.isAdmin };
};
