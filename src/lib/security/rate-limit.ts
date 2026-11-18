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
  | "loginCompound"
  | "loginIp"
  | "register"
  | "forgotPassword"
  | "resetPassword"
  | "changePassword"
  | "resendVerification"
  | "verifyEmail"
  | "sessionManagement"
  | "accountDeletion"
  | "search"
  | "newsletter"
  | "profileUpdate"
  | "customerUpload"
  | "submitReview"
  | "adminUserManagement"
  | "adminCustomerSecurity"
  | "adminRefund"
  | "adminInventory";

interface LimitConfig {
  max: number;
  windowMs: number;
}

const LIMIT_CONFIGS: Record<RateLimitEndpoint, LimitConfig> = {
  login: { max: 5, windowMs: 5 * 60 * 1000 },
  loginCompound: { max: 5, windowMs: 5 * 60 * 1000 },
  loginIp: { max: 30, windowMs: 5 * 60 * 1000 },
  register: { max: 5, windowMs: 10 * 60 * 1000 },
  forgotPassword: { max: 3, windowMs: 60 * 60 * 1000 },
  resetPassword: { max: 5, windowMs: 60 * 60 * 1000 },
  changePassword: { max: 5, windowMs: 10 * 60 * 1000 },
  resendVerification: { max: 3, windowMs: 60 * 60 * 1000 },
  verifyEmail: { max: 5, windowMs: 60 * 60 * 1000 },
  sessionManagement: { max: 10, windowMs: 15 * 60 * 1000 },
  accountDeletion: { max: 3, windowMs: 60 * 60 * 1000 },
  search: { max: 60, windowMs: 60 * 1000 },
  newsletter: { max: 5, windowMs: 10 * 60 * 1000 },
  profileUpdate: { max: 10, windowMs: 15 * 60 * 1000 },
  customerUpload: { max: 10, windowMs: 10 * 60 * 1000 },
  submitReview: { max: 10, windowMs: 10 * 60 * 1000 },
  adminUserManagement: { max: 30, windowMs: 10 * 60 * 1000 },
  adminCustomerSecurity: { max: 30, windowMs: 15 * 60 * 1000 },
  adminRefund: { max: 50, windowMs: 5 * 60 * 1000 },
  adminInventory: { max: 100, windowMs: 5 * 60 * 1000 },
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
const loginCompoundLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "5 m"), analytics: true })
  : null;
const loginIpLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "5 m"), analytics: true })
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
const searchLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), analytics: true })
  : null;
const newsletterLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), analytics: true })
  : null;
const profileUpdateLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "15 m"), analytics: true })
  : null;
const customerUploadLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "10 m"), analytics: true })
  : null;
const submitReviewLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "10 m"), analytics: true })
  : null;
const adminUserManagementLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "10 m"), analytics: true })
  : null;
const adminCustomerSecurityLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "15 m"), analytics: true })
  : null;
const adminRefundLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(50, "5 m"), analytics: true })
  : null;
const adminInventoryLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "5 m"), analytics: true })
  : null;

/**
 * Resolves the client IP address from trusted reverse-proxy headers.
 *
 * Hosting & Proxy Assumptions:
 * - VibeLock is hosted on Vercel. Vercel edge infrastructure reliably overwrites
 *   `x-real-ip` with the connecting client socket IP. Client-supplied values are stripped/overwritten.
 * - As a proxy fallback, the last entry in `x-forwarded-for` is appended by the closest trusted proxy.
 * - Direct client-supplied headers (e.g. `cf-connecting-ip`) are NOT trusted because Cloudflare
 *   is not in the deployment path and arbitrary client-supplied headers can be forged.
 * - If trusted headers are absent, returns null instead of falling back to a shared localhost bucket,
 *   preventing denial-of-service collisions among clients with missing IP headers.
 */
export async function getIp(): Promise<string | null> {
  try {
    const headersList = await headers();
    const realIp = headersList.get("x-real-ip");
    const forwardedFor = headersList.get("x-forwarded-for");

    if (realIp && realIp.trim()) {
      return realIp.trim();
    }

    if (forwardedFor && forwardedFor.trim()) {
      const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1];
      }
    }

    return null;
  } catch {
    // Safe fallback when invoked outside request scope
    return null;
  }
}

// Check if rate limited (Throws generic safe error if limit exceeded)
export async function checkRateLimit(
  endpoint: RateLimitEndpoint,
  identityModifier?: string,
  options?: { skipIp?: boolean; explicitIp?: string }
) {
  const resolvedIp = options?.skipIp ? "" : (options?.explicitIp ?? (await getIp()));
  const ip = resolvedIp ?? "";
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
      case "loginCompound":
        limiter = loginCompoundLimiter;
        break;
      case "loginIp":
        limiter = loginIpLimiter;
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
      case "search":
        limiter = searchLimiter;
        break;
      case "newsletter":
        limiter = newsletterLimiter;
        break;
      case "profileUpdate":
        limiter = profileUpdateLimiter;
        break;
      case "customerUpload":
        limiter = customerUploadLimiter;
        break;
      case "submitReview":
        limiter = submitReviewLimiter;
        break;
      case "adminUserManagement":
        limiter = adminUserManagementLimiter;
        break;
      case "adminCustomerSecurity":
        limiter = adminCustomerSecurityLimiter;
        break;
      case "adminRefund":
        limiter = adminRefundLimiter;
        break;
      case "adminInventory":
        limiter = adminInventoryLimiter;
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
    // SEC-4B-02: Structured server-side warning log (strictly sanitized, no PII, no credentials)
    console.warn(
      JSON.stringify({
        event: "RATE_LIMIT_REDIS_FALLBACK",
        level: "warn",
        endpoint,
        message: "Upstash Redis unavailable during rate limiting. Activating local in-memory fallback.",
        error: error instanceof Error ? error.message : "Unknown Redis error",
        timestamp: new Date().toISOString(),
      })
    );
    const allowed = checkMemoryRateLimit(identifier, endpoint);
    if (!allowed) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
  }
}

/**
 * SEC-4B-01 & SEC-4B-03: Layered login rate limiter.
 *
 * 1. Global per-IP throttling: 30 attempts / 5 minutes per client IP.
 *    Only evaluated when a trusted client IP is resolved.
 *    If IP is missing, avoids grouping all users into a shared localhost/unknown bucket.
 * 2. Compound IP + normalized account throttling: 5 attempts / 5 minutes.
 *    Key: `loginCompound:${clientIp}:${normalizedEmail}`
 *    Ensures failed attempts from attacker IP A cannot exhaust quota for legitimate user on IP B.
 */
export async function checkLoginRateLimit(
  email: string,
  explicitIp?: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const resolvedIp = explicitIp !== undefined ? explicitIp : await getIp();

  // 1. Global per-IP throttling (defense against single IP credential spraying across accounts)
  if (resolvedIp && resolvedIp !== "unknown") {
    await checkRateLimit("loginIp", resolvedIp, { skipIp: true });
  } else {
    // Log safe structured server warning without PII
    console.warn(
      JSON.stringify({
        event: "RATE_LIMIT_MISSING_CLIENT_IP",
        level: "warn",
        message: "Client IP could not be resolved from trusted proxy headers. Bypassing global IP bucket to prevent shared-bucket DoS.",
        timestamp: new Date().toISOString(),
      })
    );
  }

  // 2. Compound IP + normalized account throttling (5 attempts / 5 min per IP per account)
  const ipKey = resolvedIp && resolvedIp !== "unknown" ? resolvedIp : "no_ip";
  const compoundKey = `${ipKey}:${normalizedEmail}`;
  await checkRateLimit("loginCompound", compoundKey, { skipIp: true });
}

/**
 * SEC-4B-01: Resets the compound rate-limit counter for the specific (IP, normalized email) pair
 * upon successful authentication.
 *
 * Guarantees that only the successful caller's compound counter is cleared,
 * never clearing another IP's rate-limiting state.
 */
export async function clearLoginRateLimit(
  email: string,
  explicitIp?: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const resolvedIp = explicitIp !== undefined ? explicitIp : await getIp();
  const ipKey = resolvedIp && resolvedIp !== "unknown" ? resolvedIp : "no_ip";
  const compoundKey = `${ipKey}:${normalizedEmail}`;
  const compoundIdentifier = `loginCompound:${compoundKey}`;

  // Clear from process-local memory store
  memoryStore.delete(compoundIdentifier);

  // Clear from Redis if configured using official Upstash Ratelimit resetUsedTokens
  if (loginCompoundLimiter) {
    try {
      await loginCompoundLimiter.resetUsedTokens(compoundIdentifier);
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "RATE_LIMIT_REDIS_RESET_ERROR",
          level: "warn",
          message: "Failed to reset Redis compound counter on login success.",
          error: err instanceof Error ? err.message : "Unknown error",
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}

/**
 * Helper to reset in-memory sliding window store (useful for clean unit and integration testing)
 */
export function resetRateLimitMemoryStore(): void {
  memoryStore.clear();
}
