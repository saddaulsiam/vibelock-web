import "server-only";
import crypto from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/config/env";
import { headers } from "next/headers";
import { normalizeBdPhoneNumber, isValidBdPhoneNumber } from "@/lib/validations/auth";

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
  | "adminInventory"
  | "otpVerifyPhone"
  | "otpVerifyIp"
  | "otpSendPhone"
  | "otpSendIp"
  | "paymentInitiationUser"
  | "paymentInitiationIp";

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
  otpVerifyPhone: { max: 5, windowMs: 10 * 60 * 1000 },
  otpVerifyIp: { max: 20, windowMs: 10 * 60 * 1000 },
  otpSendPhone: { max: 5, windowMs: 10 * 60 * 1000 },
  otpSendIp: { max: 15, windowMs: 10 * 60 * 1000 },
  paymentInitiationUser: { max: 10, windowMs: 15 * 60 * 1000 },
  paymentInitiationIp: { max: 30, windowMs: 15 * 60 * 1000 },
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

/**
 * Endpoints that require strict distributed rate-limiting in production.
 * If distributed rate limiting (Upstash Redis) is unavailable or degraded in production,
 * these sensitive authentication, authorization, financial, and admin endpoints MUST fail closed
 * to prevent distributed brute-force, credential stuffing, and bypass across serverless instances.
 */
export const SENSITIVE_RATE_LIMIT_ENDPOINTS: ReadonlySet<RateLimitEndpoint> = new Set([
  "login",
  "loginCompound",
  "loginIp",
  "register",
  "forgotPassword",
  "resetPassword",
  "changePassword",
  "resendVerification",
  "verifyEmail",
  "sessionManagement",
  "accountDeletion",
  "adminUserManagement",
  "adminCustomerSecurity",
  "adminRefund",
  "adminInventory",
  "otpVerifyPhone",
  "otpVerifyIp",
  "otpSendPhone",
  "otpSendIp",
  "paymentInitiationUser",
  "paymentInitiationIp",
]);

export function isSensitiveRateLimitEndpoint(endpoint: RateLimitEndpoint): boolean {
  return SENSITIVE_RATE_LIMIT_ENDPOINTS.has(endpoint);
}

// Distributed limiters map keyed by endpoint
const limiters = new Map<RateLimitEndpoint, Ratelimit>();

function initLimiters() {
  limiters.clear();
  if (!redis) return;

  limiters.set("login", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "5 m"), analytics: true }));
  limiters.set("loginCompound", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "5 m"), analytics: true }));
  limiters.set("loginIp", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "5 m"), analytics: true }));
  limiters.set("register", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), analytics: true }));
  limiters.set("forgotPassword", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), analytics: true }));
  limiters.set("resetPassword", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), analytics: true }));
  limiters.set("changePassword", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), analytics: true }));
  limiters.set("resendVerification", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), analytics: true }));
  limiters.set("verifyEmail", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), analytics: true }));
  limiters.set("sessionManagement", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "15 m"), analytics: true }));
  limiters.set("accountDeletion", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), analytics: true }));
  limiters.set("search", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), analytics: true }));
  limiters.set("newsletter", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), analytics: true }));
  limiters.set("profileUpdate", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "15 m"), analytics: true }));
  limiters.set("customerUpload", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "10 m"), analytics: true }));
  limiters.set("submitReview", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "10 m"), analytics: true }));
  limiters.set("adminUserManagement", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "10 m"), analytics: true }));
  limiters.set("adminCustomerSecurity", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "15 m"), analytics: true }));
  limiters.set("adminRefund", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(50, "5 m"), analytics: true }));
  limiters.set("adminInventory", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "5 m"), analytics: true }));
  limiters.set("otpVerifyPhone", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), analytics: true }));
  limiters.set("otpVerifyIp", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "10 m"), analytics: true }));
  limiters.set("otpSendPhone", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), analytics: true }));
  limiters.set("otpSendIp", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(15, "10 m"), analytics: true }));
  limiters.set("paymentInitiationUser", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "15 m"), analytics: true }));
  limiters.set("paymentInitiationIp", new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "15 m"), analytics: true }));
}

initLimiters();

export function isDistributedRateLimitAvailable(): boolean {
  return redis !== null;
}

export function getLimiterForEndpoint(endpoint: RateLimitEndpoint): Ratelimit | null {
  return limiters.get(endpoint) ?? null;
}

export function setLimiterForTesting(endpoint: RateLimitEndpoint, limiter: Ratelimit | null): void {
  if (limiter) {
    limiters.set(endpoint, limiter);
  } else {
    limiters.delete(endpoint);
  }
}

export function setRedisClientForTesting(client: Redis | null): void {
  redis = client;
  initLimiters();
}

/**
 * Validates whether a string looks like a plausible IPv4 or IPv6 address.
 * Rejects obviously malformed, garbage, or attacker-injected values.
 *
 * Accepts:
 * - IPv4: dotted-decimal with 4 octets (0-255 each)
 * - IPv6: standard/compressed/IPv4-mapped forms (2-39 chars hex and colons)
 *
 * Rejects:
 * - Empty/whitespace strings, hostnames, SQL injection payloads, header injection
 */
export function isPlausibleIp(value: string): boolean {
  if (!value || typeof value !== "string" || value.length > 45) return false;
  const trimmed = value.trim();

  // IPv4 validation: exactly 4 numeric octets between 0 and 255
  const ipv4Parts = trimmed.split(".");
  if (ipv4Parts.length === 4) {
    return ipv4Parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) return false;
      const num = Number(part);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6 validation: hex and colons, must contain at least one colon
  if (trimmed.includes(":") && /^[0-9a-fA-F:]{2,39}$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Resolves the client IP address from trusted platform headers in the Vercel environment.
 *
 * Official Vercel Request Headers Specification:
 * - `x-real-ip`: Injected and overwritten by Vercel edge with the public IP address of the client.
 * - `x-vercel-forwarded-for`: System header set by Vercel containing the evaluated client IP.
 * - `x-forwarded-for`: In the documented Vercel environment, contains the public client IP address.
 *   On Vercel, `x-real-ip` is identical in value to `x-forwarded-for`.
 *
 * Trust Boundary & Ambiguity Defense:
 * - A valid client IP in this deployment MUST be a single, unambiguous IPv4 or IPv6 address.
 * - Comma-separated (multi-value) input in `x-forwarded-for` or other headers is ambiguous:
 *   arbitrary selection of the first entry (parts[0]) or last entry (parts[last]) is unsafe
 *   in the absence of a verified, documented trusted-proxy configuration.
 *   Therefore, multi-value header strings are strictly REJECTED (fail-closed to null).
 * - Direct client-supplied headers (e.g. `cf-connecting-ip`, `true-client-ip`, `x-client-ip`)
 *   are NOT trusted and are ignored because no external CDN is in the deployment path.
 * - If no trusted platform header contains a single valid IP, returns null.
 */
export async function getIp(
  explicitHeaders?: Headers | { get(name: string): string | null }
): Promise<string | null> {
  try {
    const headersList = explicitHeaders ?? (await headers());

    // Candidates in precedence order:
    // 1. x-real-ip (primary Vercel client IP header)
    // 2. x-vercel-forwarded-for (Vercel system header)
    // 3. x-forwarded-for (Vercel-managed client IP header)
    const candidateHeaders = [
      "x-real-ip",
      "x-vercel-forwarded-for",
      "x-forwarded-for",
    ] as const;

    for (const headerName of candidateHeaders) {
      const rawValue = headersList.get(headerName);
      if (!rawValue) continue;

      const trimmed = rawValue.trim();
      if (!trimmed) continue;

      // Reject ambiguous comma-separated multi-value chains.
      // In Vercel's documented deployment, client IP is a single value.
      // Multi-value chains without a documented trusted-proxy configuration are rejected.
      if (trimmed.includes(",")) {
        continue;
      }

      // Validate that the value is a single, valid IPv4 or IPv6 address
      if (isPlausibleIp(trimmed)) {
        return trimmed;
      }
    }

    return null;
  } catch {
    // Safe fallback when invoked outside request scope (tests, build-time)
    return null;
  }
}

// Check if rate limited (Throws generic safe error if limit exceeded)
export async function checkRateLimit(
  endpoint: RateLimitEndpoint,
  identityModifier?: string,
  options?: { skipIp?: boolean; explicitIp?: string }
) {
  const isProd = process.env.NODE_ENV === "production";
  const isSensitive = isSensitiveRateLimitEndpoint(endpoint);

  const resolvedIp = options?.skipIp ? "" : (options?.explicitIp ?? (await getIp()));
  const ip = resolvedIp ?? "";
  const identifier =
    options?.skipIp && identityModifier
      ? `${endpoint}:${identityModifier}`
      : identityModifier
        ? `${endpoint}:${ip}:${identityModifier}`
        : `${endpoint}:${ip}`;

  // 1. Missing Redis Configuration Policy
  if (!redis) {
    if (isProd && isSensitive) {
      console.error(
        JSON.stringify({
          event: "RATE_LIMIT_DISTRIBUTED_REQUIRED_FAIL_CLOSED",
          level: "error",
          endpoint,
          message:
            "Distributed rate limiting via Upstash Redis is required in production for sensitive endpoints. Failing closed to prevent distributed bypass across serverless instances.",
          timestamp: new Date().toISOString(),
        })
      );
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    // In development/test or for non-sensitive public endpoints:
    const allowed = checkMemoryRateLimit(identifier, endpoint);
    if (!allowed) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    return;
  }

  // 2. Distributed Rate Limiting via Upstash
  try {
    const limiter = limiters.get(endpoint);

    if (!limiter) {
      if (isProd && isSensitive) {
        console.error(
          JSON.stringify({
            event: "RATE_LIMIT_LIMITER_MISSING_FAIL_CLOSED",
            level: "error",
            endpoint,
            message:
              "Limiter configuration missing for sensitive endpoint in production. Failing closed.",
            timestamp: new Date().toISOString(),
          })
        );
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
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

    // 3. Infrastructure Error Handling Policy
    if (isProd && isSensitive) {
      console.error(
        JSON.stringify({
          event: "RATE_LIMIT_INFRASTRUCTURE_FAILURE_FAIL_CLOSED",
          level: "error",
          endpoint,
          message:
            "Upstash Redis infrastructure error during rate limiting for sensitive endpoint. Failing closed to prevent distributed bypass.",
          error: error instanceof Error ? error.message : "Unknown Redis error",
          timestamp: new Date().toISOString(),
        })
      );
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    // Non-sensitive public endpoints or non-production environment:
    console.warn(
      JSON.stringify({
        event: "RATE_LIMIT_REDIS_FALLBACK",
        level: "warn",
        endpoint,
        message:
          "Upstash Redis unavailable during rate limiting. Activating local in-memory fallback for non-sensitive endpoint.",
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
 * Normalizes a login identifier (email or Bangladeshi phone number) deterministically
 * for consistent rate-limiting across input formatting variants.
 */
export function normalizeLoginIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (isValidBdPhoneNumber(trimmed)) {
    return normalizeBdPhoneNumber(trimmed);
  }
  return trimmed.toLowerCase();
}

/**
 * SEC-4B-01 & SEC-4B-03: Layered login rate limiter.
 *
 * 1. Global per-IP throttling: 30 attempts / 5 minutes per client IP.
 *    Only evaluated when a trusted client IP is resolved.
 *    If IP is missing, avoids grouping all users into a shared localhost/unknown bucket.
 * 2. Compound IP + normalized account throttling: 5 attempts / 5 minutes.
 *    Key: `loginCompound:${clientIp}:${normalizedIdentifier}`
 *    Ensures failed attempts from attacker IP A cannot exhaust quota for legitimate user on IP B.
 */
export async function checkLoginRateLimit(
  email: string,
  explicitIp?: string
): Promise<void> {
  const normalizedIdentifier = normalizeLoginIdentifier(email);
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
  const compoundKey = `${ipKey}:${normalizedIdentifier}`;
  await checkRateLimit("loginCompound", compoundKey, { skipIp: true });
}

/**
 * SEC-4B-01: Resets the compound rate-limit counter for the specific (IP, normalized account) pair
 * upon successful authentication.
 *
 * Guarantees that only the successful caller's compound counter is cleared,
 * never clearing another IP's rate-limiting state.
 */
export async function clearLoginRateLimit(
  email: string,
  explicitIp?: string
): Promise<void> {
  const normalizedIdentifier = normalizeLoginIdentifier(email);
  const resolvedIp = explicitIp !== undefined ? explicitIp : await getIp();
  const ipKey = resolvedIp && resolvedIp !== "unknown" ? resolvedIp : "no_ip";
  const compoundKey = `${ipKey}:${normalizedIdentifier}`;
  const compoundIdentifier = `loginCompound:${compoundKey}`;

  // Clear from process-local memory store
  memoryStore.delete(compoundIdentifier);

  // Clear from Redis if configured using official Upstash Ratelimit resetUsedTokens
  const limiter = limiters.get("loginCompound");
  if (limiter) {
    try {
      await limiter.resetUsedTokens(compoundIdentifier);
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
 * Generates an irreversible, privacy-safe 16-character HMAC-SHA256 pseudonym
 * keyed with the server-side AUTH_SECRET.
 *
 * Security Rationale:
 * Plain SHA-256 hashes of low-entropy identifiers (such as 11-digit Bangladeshi mobile numbers)
 * are vulnerable to offline rainbow table / dictionary enumeration attacks (~7x10^7 search space).
 * Using HMAC-SHA256 with the secret AUTH_SECRET prevents offline inversion while remaining
 * fully deterministic across all serverless instances sharing the secret.
 *
 * Normalization & Exact-Byte Modes:
 * - Default (options.raw !== true): Applies `.trim().toLowerCase()`. This is appropriate for
 *   natural user-entered identifiers such as phone numbers and email addresses, ensuring
 *   deterministic matching regardless of casing or accidental whitespace.
 * - Raw / Opaque Mode (options.raw === true): Uses the exact bytes/characters of `value`
 *   WITHOUT lowercasing or trimming. This is required for opaque, case-sensitive identifiers
 *   such as Auth.js session tokens (Base64/Base64URL) and UUID cart IDs, preventing
 *   hash collisions between distinct case-sensitive tokens and preserving token integrity.
 *
 * Operational Semantics:
 * - Distributed Rate Limiting: Rate limit keys in Redis have short sliding-window TTLs
 *   (e.g., 10 minutes for OTP, 1 minute for search).
 * - AUTH_SECRET Rotation: Rotating AUTH_SECRET changes the HMAC key and deterministically
 *   re-keys all future hashes. Existing counters in Redis naturally expire within their TTL
 *   window without manual cache eviction needed.
 *
 * Raw phone numbers, tokens, and the HMAC secret are never stored in rate limit identifiers, telemetry, or logs.
 */
export function hashForRateLimit(
  value: string,
  options?: { raw?: boolean }
): string {
  const secret = env.AUTH_SECRET || "vibelock-rate-limit-default-secret-salt";
  const input = options?.raw ? value : value.trim().toLowerCase();
  return crypto
    .createHmac("sha256", secret)
    .update(input)
    .digest("hex")
    .slice(0, 16);
}

/**
 * SEC-12-01 & SEC-12-04: Layered phone OTP verification rate limiter.
 *
 * 1. Global per-IP ceiling (otpVerifyIp): 20 attempts / 10 minutes per client IP.
 *    Only evaluated when a trusted client IP is resolved.
 *    Protects against single-IP attackers rotating across hundreds of phone numbers.
 * 2. Privacy-safe per-phone throttling (otpVerifyPhone): 5 attempts / 10 minutes per phone hash.
 *    Key: `otpVerifyPhone:${phoneHash}`
 *    Ensures attackers cannot repeatedly guess the 6-digit OTP code.
 */
export async function checkOtpRateLimit(
  phone: string,
  explicitIp?: string
): Promise<void> {
  const normalizedPhone = normalizeBdPhoneNumber(phone);
  const resolvedIp = explicitIp !== undefined ? explicitIp : await getIp();

  // 1. IP ceiling (defense against rotating phone numbers from a single IP)
  if (resolvedIp && resolvedIp !== "unknown") {
    await checkRateLimit("otpVerifyIp", resolvedIp, { skipIp: true });
  } else {
    console.warn(
      JSON.stringify({
        event: "RATE_LIMIT_MISSING_CLIENT_IP",
        level: "warn",
        message: "Client IP could not be resolved from trusted proxy headers. Bypassing global IP bucket for OTP verify.",
        timestamp: new Date().toISOString(),
      })
    );
  }

  // 2. Privacy-safe per-phone throttling (5 attempts / 10 min)
  const phoneHash = hashForRateLimit(normalizedPhone);
  await checkRateLimit("otpVerifyPhone", phoneHash, { skipIp: true });
}

/**
 * Clears the OTP verification rate-limit counter for a phone number upon successful verification.
 */
export async function clearOtpRateLimit(phone: string): Promise<void> {
  const normalizedPhone = normalizeBdPhoneNumber(phone);
  const phoneHash = hashForRateLimit(normalizedPhone);
  const identifier = `otpVerifyPhone:${phoneHash}`;

  // Clear from process-local memory store
  memoryStore.delete(identifier);

  // Clear from Redis if configured
  const limiter = limiters.get("otpVerifyPhone");
  if (limiter) {
    try {
      await limiter.resetUsedTokens(identifier);
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "RATE_LIMIT_REDIS_RESET_ERROR",
          level: "warn",
          message: "Failed to reset Redis OTP counter on verification success.",
          error: err instanceof Error ? err.message : "Unknown error",
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}

/**
 * Enforces rate limits on requesting/sending phone OTPs.
 * Completely decoupled from OTP verification to ensure legitimate users
 * are never blocked from resending due to verification attempt exhaustion.
 *
 * 1. Global per-IP ceiling (otpSendIp): 15 requests / 10 minutes.
 * 2. Privacy-safe per-phone throttling (otpSendPhone): 5 requests / 10 minutes.
 */
export async function checkOtpSendRateLimit(
  phone: string,
  explicitIp?: string
): Promise<void> {
  const normalizedPhone = normalizeBdPhoneNumber(phone);
  const resolvedIp = explicitIp !== undefined ? explicitIp : await getIp();

  if (resolvedIp && resolvedIp !== "unknown") {
    await checkRateLimit("otpSendIp", resolvedIp, { skipIp: true });
  } else {
    // SEC-12-04: Structured server-side warning when trusted IP cannot be resolved.
    // Per-phone HMAC throttle (otpSendPhone) still applies — this is not a bypass.
    console.warn(
      JSON.stringify({
        event: "RATE_LIMIT_MISSING_CLIENT_IP",
        level: "warn",
        message:
          "Client IP could not be resolved from trusted proxy headers. Bypassing global IP bucket for OTP send.",
        timestamp: new Date().toISOString(),
      })
    );
  }

  const phoneHash = hashForRateLimit(normalizedPhone);
  await checkRateLimit("otpSendPhone", phoneHash, { skipIp: true });
}

/**
 * SEC-12-02: Payment Initiation Rate Limiter.
 *
 * Threshold Rationale:
 * 1. Global per-IP ceiling (paymentInitiationIp): 30 attempts / 15 minutes.
 *    - Uses trusted platform IP extraction from `getIp()`.
 *    - Protects payment gateway APIs and merchant accounts from automated card-testing,
 *      distributed payment flooding, and gateway API credential exhaustion.
 *    - In shared NAT environments (e.g. Bangladesh mobile networks / universities),
 *      30 attempts / 15 minutes provides ample capacity for multiple concurrent shoppers.
 *    - Safe missing-IP handling: If trusted client IP cannot be resolved, logs a structured
 *      warning and bypasses the global IP ceiling rather than grouping unidentifiable callers
 *      into a shared "anonymous" bucket, avoiding shared-bucket DoS against innocent customers.
 * 2. Authenticated Customer / Stable Identity throttling (paymentInitiationUser): 10 attempts / 15 minutes.
 *    - Key: `paymentInitiationUser:${userHash}` using exact-byte HMAC mode (raw: true).
 *    - 10 attempts in 15 minutes allows customers sufficient headroom to retry after card declines
 *      or switch payment methods, while stopping script-driven abuse.
 */
export async function checkPaymentInitiationRateLimit(
  userId?: string | null,
  explicitIp?: string
): Promise<void> {
  const resolvedIp = explicitIp !== undefined ? explicitIp : await getIp();

  // 1. Global IP ceiling (defense against automated script attacks from a single IP)
  if (resolvedIp && resolvedIp !== "unknown") {
    await checkRateLimit("paymentInitiationIp", resolvedIp, { skipIp: true });
  } else {
    console.warn(
      JSON.stringify({
        event: "RATE_LIMIT_MISSING_CLIENT_IP",
        level: "warn",
        message:
          "Client IP could not be resolved from trusted proxy headers. Bypassing global IP bucket for payment initiation.",
        timestamp: new Date().toISOString(),
      })
    );
  }

  // 2. Authenticated customer throttling (10 attempts / 15 min per customer)
  if (userId && typeof userId === "string" && userId.trim()) {
    const userHash = hashForRateLimit(userId, { raw: true });
    await checkRateLimit("paymentInitiationUser", userHash, { skipIp: true });
  }
}

/**
 * Clears the customer-level payment initiation rate-limit counter upon successful checkout/payment.
 */
export async function clearPaymentInitiationRateLimit(userId: string): Promise<void> {
  if (!userId || typeof userId !== "string" || !userId.trim()) return;
  const userHash = hashForRateLimit(userId, { raw: true });
  const identifier = `paymentInitiationUser:${userHash}`;

  memoryStore.delete(identifier);

  const limiter = limiters.get("paymentInitiationUser");
  if (limiter) {
    try {
      await limiter.resetUsedTokens(identifier);
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "RATE_LIMIT_REDIS_RESET_ERROR",
          level: "warn",
          message: "Failed to reset Redis payment initiation counter.",
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
