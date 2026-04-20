export type AuthRole = "admin" | "user";

export const authCookieNames = {
  role: "tp_role",
  session: "tp_session",
  user: "tp_user",
  userId: "tp_user_id",
} as const;

export const isAdminRoute = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/");

export const isProtectedRoute = (pathname: string) =>
  pathname === "/trade" ||
  pathname.startsWith("/trade/") ||
  pathname === "/admin" ||
  pathname.startsWith("/admin/");
