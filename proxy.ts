import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authCookieNames, isAdminRoute, isProtectedRoute } from "@/lib/auth/constants";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = request.cookies.get(authCookieNames.session)?.value === "active";
  const role = request.cookies.get(authCookieNames.role)?.value;

  if (isProtectedRoute(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute(pathname) && role !== "admin") {
    return NextResponse.redirect(new URL("/trade", request.url));
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/trade", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/trade/:path*", "/admin/:path*"],
};
