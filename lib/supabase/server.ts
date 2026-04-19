import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env/server";

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as CookieOptions);
          });
        } catch {
          // Server Components cannot always write cookies during render.
        }
      },
    },
  });
};
