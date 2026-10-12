// Shared rate limiting — backed by the Upstash Redis store provisioned via
// the Vercel Marketplace (hardening-roadmap item #2). Env vars come from
// that integration as KV_REST_API_URL / KV_REST_API_TOKEN (the legacy
// @vercel/kv naming Vercel still uses for Upstash-provisioned stores) —
// NOT the UPSTASH_REDIS_REST_* names Redis.fromEnv() expects, so the
// client is built explicitly below instead.
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

if (!redis) {
  console.error("[rate-limit] KV_REST_API_URL/KV_REST_API_TOKEN not set — rate limiting is disabled (fail-open).");
}

export type RateLimitResult = { success: boolean; limit: number; remaining: number; reset: number };

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

/**
 * Builds a rate limiter scoped under its own Redis key prefix. Fails OPEN
 * (returns success: true) when Redis isn't configured, rather than taking
 * every protected route down if the store is ever misconfigured — being
 * unprotected is a better failure mode here than a full outage.
 */
export function createRateLimiter(prefix: string, limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  const limiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, window),
        prefix: `ratelimit:${prefix}`,
      })
    : null;

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      if (!limiter) return { success: true, limit, remaining: limit, reset: 0 };
      try {
        return await limiter.limit(identifier);
      } catch (err) {
        // Redis hiccup — fail open rather than block legitimate traffic.
        console.error(`[rate-limit:${prefix}] check failed, failing open:`, err);
        return { success: true, limit, remaining: limit, reset: 0 };
      }
    },
  };
}
