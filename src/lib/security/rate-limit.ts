import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/config/env";
import { headers } from "next/headers";

let redis: Redis | null = null;
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Define rate limit configurations
export type RateLimitEndpoint =
  | "login"
  | "register"
  | "forgotPassword"
  | "resetPassword"
  | "changePassword"
  | "resendVerification"
  | "verifyEmail"
  | "sessionManagement"
  | "accountDeletion";

interface LimitConfig {
  max: number;
  windowMs: number;
}

const LIMIT_CONFIGS: Record<RateLimitEndpoint, LimitConfig> = {
  login: { max: 5, windowMs: 5 * 60 * 1000 },
  register: { max: 5, windowMs: 10 * 60 * 1000 },
  forgotPassword: { max: 3, windowMs: 60 * 60 * 1000 },
  resetPassword: { max: 5, windowMs: 60 * 60 * 1000 },
  changePassword: { max: 5, windowMs: 10 * 60 * 1000 },
  resendVerification: { max: 3, windowMs: 60 * 60 * 1000 },
  verifyEmail: { max: 5, windowMs: 60 * 60 * 1000 },
  sessionManagement: { max: 10, windowMs: 15 * 60 * 1000 },
  accountDeletion: { max: 3, windowMs: 60 * 60 * 1000 },
};

// In-memory sliding window rate limiter store
const memoryStore = new Map<string, number[]>();

function checkMemoryRateLimit(identifier: string, endpoint: RateLimitEndpoint): boolean {
  const config = LIMIT_CONFIGS[endpoint];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = (memoryStore.get(identifier) || []).filter((t) => t > windowStart);

  if (timestamps.length >= config.max) {
    return false;
  }

  timestamps.push(now);
  memoryStore.set(identifier, timestamps);

  // Periodic cleanup if store exceeds 5,000 keys
  if (memoryStore.size > 5000) {
    for (const [key, list] of memoryStore.entries()) {
      const active = list.filter((t) => t > windowStart);
      if (active.length === 0) {
        memoryStore.delete(key);
      } else {
        memoryStore.set(key, active);
      }
    }
  }

  return true;
}

// Define the Upstash limiters (used when Upstash is configured)
const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "5 m"), analytics: true })
  : null;
const registerLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), analytics: true })
  : null;
const forgotPasswordLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), analytics: true })
  : null;
const resetPasswordLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), analytics: true })
  : null;
const changePasswordLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), analytics: true })
  : null;
const resendVerificationLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), analytics: true })
  : null;
const verifyEmailLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), analytics: true })
  : null;
const sessionManagementLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "15 m"), analytics: true })
  : null;
const accountDeletionLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), analytics: true })
  : null;

// Helper to get client IP
async function getIp() {
  const headersList = await headers();
  // On Vercel, x-forwarded-for is populated reliably by their proxy.
  // We take the first IP which is the client IP.
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");

  let ip = "unknown";
  if (forwardedFor) {
    ip = forwardedFor.split(",")[0].trim();
  } else if (realIp) {
    ip = realIp.trim();
  }

  // Fallback safely if running locally in production or proxy strips IP headers
  if (ip === "unknown") {
    ip = "127.0.0.1";
  }

  return ip;
}

// Check if rate limited (Throws generic safe error if limit exceeded)
export async function checkRateLimit(
  endpoint: RateLimitEndpoint,
  identityModifier?: string,
  options?: { skipIp?: boolean }
) {
  const ip = options?.skipIp ? "" : await getIp();
  const identifier =
    options?.skipIp && identityModifier
      ? `${endpoint}:${identityModifier}`
      : identityModifier
        ? `${endpoint}:${ip}:${identityModifier}`
        : `${endpoint}:${ip}`;

  // If Upstash Redis is not configured, use in-memory rate limiter fallback
  if (!redis) {
    const allowed = checkMemoryRateLimit(identifier, endpoint);
    if (!allowed) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    return;
  }

  try {
    let limiter: Ratelimit | null = null;
    switch (endpoint) {
      case "login":
        limiter = loginLimiter;
        break;
      case "register":
        limiter = registerLimiter;
        break;
      case "forgotPassword":
        limiter = forgotPasswordLimiter;
        break;
      case "resetPassword":
        limiter = resetPasswordLimiter;
        break;
      case "changePassword":
        limiter = changePasswordLimiter;
        break;
      case "resendVerification":
        limiter = resendVerificationLimiter;
        break;
      case "verifyEmail":
        limiter = verifyEmailLimiter;
        break;
      case "sessionManagement":
        limiter = sessionManagementLimiter;
        break;
      case "accountDeletion":
        limiter = accountDeletionLimiter;
        break;
    }

    if (!limiter) {
      const allowed = checkMemoryRateLimit(identifier, endpoint);
      if (!allowed) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
      return;
    }

    const { success } = await limiter.limit(identifier);

    if (!success) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      throw error;
    }
    // If Redis encounters a network error, gracefully fall back to in-memory rate limiting
    console.warn("Upstash Redis error during rate limiting, falling back to memory store:", error);
    const allowed = checkMemoryRateLimit(identifier, endpoint);
    if (!allowed) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
  }
}
