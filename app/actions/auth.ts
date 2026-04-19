"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames, isAdminRoute, type AuthRole } from "@/lib/auth/constants";
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
  const role = getRoleFromEmail(email);
  const redirectPath = role === "admin" ? (isAdminRoute(nextPath) ? nextPath : "/admin") : nextPath;
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(authCookieNames.session, "active", {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure,
  });
  cookieStore.set(authCookieNames.role, role, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure,
  });
  cookieStore.set(authCookieNames.user, getUsernameFromEmail(email), {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure,
  });

  redirect(redirectPath);
};

export const signOutPreview = async () => {
  const cookieStore = await cookies();

  cookieStore.set(authCookieNames.session, "", { maxAge: 0, path: "/" });
  cookieStore.set(authCookieNames.role, "", { maxAge: 0, path: "/" });
  cookieStore.set(authCookieNames.user, "", { maxAge: 0, path: "/" });

  redirect("/login");
};
