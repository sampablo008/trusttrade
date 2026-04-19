import "server-only";

let rateLimiter: ((userId: string) => Promise<{ success: boolean }>) | null = null;

const buildLimiter = async () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({ url, token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 s"),
    prefix: "tp:place_trade",
  });

  return async (userId: string) => limiter.limit(userId);
};

export const checkTradeRateLimit = async (userId: string): Promise<void> => {
  if (!rateLimiter) {
    rateLimiter = await buildLimiter();
  }

  if (!rateLimiter) return; // No Redis configured — allow in preview

  const { success } = await rateLimiter(userId);
  if (!success) {
    const { ApiClientError } = await import("@/lib/api/client");
    throw new ApiClientError(
      "Too many trade requests. Wait a moment.",
      429,
      "RATE_LIMITED",
    );
  }
};
