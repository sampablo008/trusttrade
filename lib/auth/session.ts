import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames, isAdminRoute, type AuthRole } from "@/lib/auth/constants";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AppSession {
  isAdmin: boolean;
  isAuthenticated: boolean;
  role: AuthRole | null;
  userId: string | null;
  username: string | null;
}

export const getAppSession = async (): Promise<AppSession> => {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get(authCookieNames.session)?.value === "active";
  const roleValue = cookieStore.get(authCookieNames.role)?.value;
  const role: AuthRole | null =
    roleValue === "admin" || roleValue === "user" ? roleValue : null;
  const username = cookieStore.get(authCookieNames.user)?.value ?? null;
  const userId = cookieStore.get(authCookieNames.userId)?.value ?? null;

  return {
    isAdmin: isAuthenticated && role === "admin",
    isAuthenticated,
    role,
    userId,
    username,
  };
};

export const assertAuthenticated = async () => {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    redirect("/login");
  }

  return session;
};

const getRoleFromEmail = (email: string): AuthRole =>
  email.toLowerCase().includes("admin") ? "admin" : "user";

const getUsernameFromEmail = (email: string) =>
  email
    .split("@")[0]
    ?.replace(/[^a-z0-9._-]/gi, "")
    .slice(0, 24) || "trader";

export interface ResolvedIdentity {
  role: AuthRole;
  userId: string | null;
  username: string;
  emailVerified: boolean;
  signupBonusPending: boolean;
}

export const resolveIdentity = async (
  email: string,
): Promise<ResolvedIdentity | null> => {
  if (!getOptionalServerEnv()) {
    return {
      role: getRoleFromEmail(email),
      userId: null,
      username: getUsernameFromEmail(email),
      emailVerified: true,
      signupBonusPending: false,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id, role, username, signup_bonus_claimed_at")
    .ilike("email", email)
    .maybeSingle();

  if (error || !data) return null;

  const authLookup = await admin.auth.admin.getUserById(data.user_id as string);
  const emailVerified = Boolean(authLookup.data.user?.email_confirmed_at);

  return {
    role: data.role as AuthRole,
    userId: data.user_id,
    username: data.username,
    emailVerified,
    signupBonusPending: data.signup_bonus_claimed_at == null,
  };
};

export const resolveRedirectPath = (
  identity: ResolvedIdentity,
  nextPath: string,
): string =>
  identity.role === "admin"
    ? isAdminRoute(nextPath)
      ? nextPath
      : "/admin"
    : identity.signupBonusPending
      ? "/welcome"
      : nextPath;

export const establishSession = async (identity: ResolvedIdentity) => {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const baseCookie = {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax" as const,
    secure,
  };

  cookieStore.set(authCookieNames.session, "active", baseCookie);
  cookieStore.set(authCookieNames.role, identity.role, baseCookie);
  cookieStore.set(authCookieNames.user, identity.username, baseCookie);
  if (identity.userId) {
    cookieStore.set(authCookieNames.userId, identity.userId, baseCookie);
  } else {
    cookieStore.set(authCookieNames.userId, "", { maxAge: 0, path: "/" });
  }
};
