import "server-only";
import { ApiClientError } from "@/lib/api/client";

const WINDOW_SECONDS = 10;
const MAX_PER_WINDOW = 5;

type Limiter = (userId: string) => Promise<boolean>;

let limiter: Limiter | null = null;
let limiterInitialized = false;

const buildLimiter = async (): Promise<Limiter | null> => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({ url, token });

  // Fixed-window counter using INCR+EXPIRE only — no Lua/evalsha, so it works
  // with REST tokens that lack scripting permission.
  return async (userId: string) => {
    const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
    const key = `tp:place_trade:${userId}:${bucket}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    return count <= MAX_PER_WINDOW;
  };
};

export const checkTradeRateLimit = async (userId: string): Promise<void> => {
  if (!limiterInitialized) {
    limiter = await buildLimiter();
    limiterInitialized = true;
  }

  if (!limiter) return; // No Redis configured — allow.

  let allowed = true;
  try {
    allowed = await limiter(userId);
  } catch (err) {
    // Fail open: a misconfigured Redis (bad token, network blip) must not
    // block trading. Log and allow.
    console.error("[rate-limit/trades] limiter call failed, allowing through", err);
    return;
  }

  if (!allowed) {
    throw new ApiClientError(
      "Too many trade requests. Wait a moment.",
      429,
      "RATE_LIMITED",
    );
  }
};
