import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authCookieNames, isAdminRoute, isProtectedRoute } from "@/lib/auth/constants";
import {
  applyProxyRateLimitHeaders,
  consumeProxyRateLimit,
} from "@/lib/rate-limit/proxy";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = request.cookies.get(authCookieNames.session)?.value === "active";
  const role = request.cookies.get(authCookieNames.role)?.value;
  const rateLimit = consumeProxyRateLimit(request);

  if (!rateLimit.allowed) {
    return applyProxyRateLimitHeaders(
      new NextResponse("Too many requests. Slow down and try again.", {
        status: 429,
      }),
      rateLimit,
    );
  }

  if (isProtectedRoute(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set("next", pathname);

    return applyProxyRateLimitHeaders(NextResponse.redirect(loginUrl), rateLimit);
  }

  if (isAdminRoute(pathname) && role !== "admin") {
    return applyProxyRateLimitHeaders(
      NextResponse.redirect(new URL("/trade", request.url)),
      rateLimit,
    );
  }

  if (pathname === "/login" && hasSession) {
    return applyProxyRateLimitHeaders(
      NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/trade", request.url)),
      rateLimit,
    );
  }

  return applyProxyRateLimitHeaders(NextResponse.next(), rateLimit);
}

export const config = {
  matcher: ["/login", "/trade/:path*", "/admin/:path*"],
};
