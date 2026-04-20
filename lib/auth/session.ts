import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames, type AuthRole } from "@/lib/auth/constants";

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
