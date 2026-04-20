"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames, isAdminRoute, type AuthRole } from "@/lib/auth/constants";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loginFormSchema, type LoginActionState } from "@/schemas/auth";

const sanitizeNextPath = (value: string | undefined) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/trade";
  }

  return value;
};

const getRoleFromEmail = (email: string): AuthRole =>
  email.toLowerCase().includes("admin") ? "admin" : "user";

const getUsernameFromEmail = (email: string) =>
  email
    .split("@")[0]
    ?.replace(/[^a-z0-9._-]/gi, "")
    .slice(0, 24) || "trader";

interface ResolvedIdentity {
  role: AuthRole;
  userId: string | null;
  username: string;
  emailVerified: boolean;
}

const resolveIdentity = async (email: string): Promise<ResolvedIdentity | null> => {
  if (!getOptionalServerEnv()) {
    return {
      role: getRoleFromEmail(email),
      userId: null,
      username: getUsernameFromEmail(email),
      emailVerified: true,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id, role, username")
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
  };
};

export const signInPreview = async (
  _previousState: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState | never> => {
  const validatedFields = loginFormSchema.safeParse({
    email: formData.get("email"),
    nextPath: formData.get("nextPath"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Fix the highlighted fields.",
    };
  }

  const email = validatedFields.data.email.toLowerCase();
  const nextPath = sanitizeNextPath(validatedFields.data.nextPath);

  const identity = await resolveIdentity(email);
  if (!identity) {
    return {
      errors: { email: ["No account found for this email."] },
      message: "Account not found.",
    };
  }

  if (!identity.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  const redirectPath =
    identity.role === "admin"
      ? isAdminRoute(nextPath)
        ? nextPath
        : "/admin"
      : nextPath;
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

  redirect(redirectPath);
};

export const signOutPreview = async () => {
  const cookieStore = await cookies();

  cookieStore.set(authCookieNames.session, "", { maxAge: 0, path: "/" });
  cookieStore.set(authCookieNames.role, "", { maxAge: 0, path: "/" });
  cookieStore.set(authCookieNames.user, "", { maxAge: 0, path: "/" });
  cookieStore.set(authCookieNames.userId, "", { maxAge: 0, path: "/" });

  redirect("/login");
};
