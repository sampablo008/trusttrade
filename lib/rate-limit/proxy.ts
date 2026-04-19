import type { NextRequest } from "next/server";

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

interface ProxyRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const proxyRateLimitStore = new Map<string, RateLimitWindow>();
const PROXY_RATE_LIMIT = {
  limit: 120,
  windowMs: 60_000,
};

const getRequestFingerprint = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();
  const agent = request.headers.get("user-agent") ?? "unknown-agent";

  return `${ip ?? "local"}:${agent}`;
};

const pruneExpiredWindows = (now: number) => {
  for (const [key, window] of proxyRateLimitStore.entries()) {
    if (window.resetAt <= now) {
      proxyRateLimitStore.delete(key);
    }
  }
};

export const consumeProxyRateLimit = (
  request: NextRequest,
  now = Date.now(),
): ProxyRateLimitResult => {
  pruneExpiredWindows(now);

  const key = getRequestFingerprint(request);
  const existingWindow = proxyRateLimitStore.get(key);

  if (!existingWindow || existingWindow.resetAt <= now) {
    const resetAt = now + PROXY_RATE_LIMIT.windowMs;

    proxyRateLimitStore.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      limit: PROXY_RATE_LIMIT.limit,
      remaining: PROXY_RATE_LIMIT.limit - 1,
      resetAt,
      retryAfterSeconds: Math.ceil(PROXY_RATE_LIMIT.windowMs / 1000),
    };
  }

  existingWindow.count += 1;
  proxyRateLimitStore.set(key, existingWindow);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existingWindow.resetAt - now) / 1000),
  );
  const remaining = Math.max(0, PROXY_RATE_LIMIT.limit - existingWindow.count);

  return {
    allowed: existingWindow.count <= PROXY_RATE_LIMIT.limit,
    limit: PROXY_RATE_LIMIT.limit,
    remaining,
    resetAt: existingWindow.resetAt,
    retryAfterSeconds,
  };
};

export const applyProxyRateLimitHeaders = (
  response: Response,
  result: ProxyRateLimitResult,
) => {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(result.resetAt / 1000)));

  if (!result.allowed) {
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
  }

  return response;
};
