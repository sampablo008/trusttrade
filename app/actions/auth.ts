"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames } from "@/lib/auth/constants";
import { getOptionalServerEnv } from "@/lib/env/server";
import {
  establishSession,
  resolveIdentity,
  resolveRedirectPath,
} from "@/lib/auth/session";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { loginFormSchema, type LoginActionState } from "@/schemas/auth";

const sanitizeNextPath = (value: string | undefined) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/trade";
  }

  return value;
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
  const password = validatedFields.data.password;
  const nextPath = sanitizeNextPath(validatedFields.data.nextPath);

  const identity = await resolveIdentity(email);
  if (!identity) {
    return {
      errors: { email: ["No account found for this email."] },
      message: "Account not found.",
    };
  }

  if (getOptionalServerEnv()) {
    const anon = createSupabaseAnonClient();
    const { error: signInError } = await anon.auth.signInWithPassword({ email, password });
    await anon.auth.signOut().catch(() => undefined);

    if (signInError) {
      return {
        message: "Incorrect email or password.",
      };
    }
  }

  if (!identity.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  const redirectPath = resolveRedirectPath(identity, nextPath);
  await establishSession(identity);

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
