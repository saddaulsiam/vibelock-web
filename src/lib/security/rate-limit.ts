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

// Define the limiters
const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "5 m"), analytics: true })
  : null;
const registerLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), analytics: true })
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

  // Prevent dangerous shared bucket in production
  if (env.NODE_ENV === "production" && ip === "unknown") {
    // Fail safely rather than creating an unacceptable shared bucket
    throw new Error("RATE_LIMIT_ERROR");
  }

  return ip;
}

// Check if rate limited (Throws generic safe error if limit exceeded, or if Redis is down for critical endpoints)
export async function checkRateLimit(
  endpoint:
    | "login"
    | "register"
    | "forgotPassword"
    | "resetPassword"
    | "changePassword"
    | "resendVerification"
    | "verifyEmail",
  identityModifier?: string
) {
  // We prefer fail-closed for Auth if Redis is not configured, but wait:
  // If we haven't configured Redis locally or in staging, we shouldn't hard-crash the app unless we explicitly want to fail-closed.
  // The instructions said: "Do not create a dangerous configuration where: Redis unavailable -> silently allow unlimited authentication attempts. For high-risk authentication endpoints, prefer fail-closed behavior where appropriate."
  // So if redis is explicitly unavailable (no config), we will fail-closed and throw, OR we can throw if the config is missing.
  // Wait, if we enforce fail-closed when there is no UPSTASH URL provided, developers cannot test locally without Upstash.
  // We will check if we are in production. If in production and Redis is missing, we fail closed for auth endpoints.

  if (!redis) {
    if (env.NODE_ENV === "production") {
      throw new Error("RATE_LIMIT_ERROR");
    }
    // Allow local development without redis
    console.warn(`⚠️ Rate limiting disabled (Upstash not configured). Endpoint: ${endpoint}`);
    return;
  }

  try {
    const ip = await getIp();
    const identifier = identityModifier
      ? `${endpoint}:${ip}:${identityModifier}`
      : `${endpoint}:${ip}`;

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
    }

    if (!limiter) return;

    const { success } = await limiter.limit(identifier);

    if (!success) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      throw error; // Let caller catch it and return generic message
    }
    // If Redis itself throws a network error, we fail closed for these sensitive endpoints
    console.error("Rate Limiter Network Error:", error);
    throw new Error("RATE_LIMIT_ERROR");
  }
}
