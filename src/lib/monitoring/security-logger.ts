import { env } from "@/lib/config/env";
import { scrubString } from "@/lib/monitoring/sentry-privacy";
import * as Sentry from "@sentry/nextjs";
import crypto from "node:crypto";
import "server-only";

/**
 * Strict allowlist of approved security event names.
 * Arbitrary event names are rejected to avoid polluting telemetry streams.
 */
export const APPROVED_SECURITY_EVENTS = [
  "AUTH_RATE_LIMIT_EXCEEDED",
  "AUTH_OTP_RATE_LIMIT_EXCEEDED",
  "AUTH_ADMIN_LOGIN_FAILED",
  "AUTH_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT",
  "PAYMENT_TAMPERING_DETECTED",
  "PAYMENT_DUPLICATE_CAPTURE_ATTEMPT",
  "PAYMENT_RATE_LIMIT_EXCEEDED",
  // Operational Failure Events (Phase 12.4.4)
  "EMAIL_DELIVERY_FAILED",
  "COURIER_DISPATCH_FAILED",
  "COURIER_WEBHOOK_REJECTED",
  "CRON_EXECUTION_FAILED",
  "CHECKOUT_ORDER_CREATION_FAILED",
] as const;

export type SecurityEventName = (typeof APPROVED_SECURITY_EVENTS)[number];

const APPROVED_SECURITY_EVENT_SET = new Set<string>(APPROVED_SECURITY_EVENTS);

/**
 * Strict allowlist of approved metadata keys.
 * Prohibited keys (e.g. passwords, raw emails, raw phones, tokens, cookies, auth headers)
 * are never attached to security events.
 */
export const APPROVED_METADATA_KEYS = new Set([
  "endpoint",
  "attemptCount",
  "windowSeconds",
  "role",
  "reason",
  "phoneHash",
  "emailHash",
  "ipMasked",
  "status",
  "gateway",
  "referenceHash",
  "orderHash",
  "provider",
  "jobName",
  "errorCode",
]);

export interface SecurityAlertMetadata {
  endpoint?: string;
  attemptCount?: number;
  windowSeconds?: number;
  role?: string;
  reason?: string;
  phoneHash?: string;
  emailHash?: string;
  ipMasked?: string;
  status?: string;
  gateway?: string;
  referenceHash?: string;
  orderHash?: string;
  provider?: string;
  jobName?: string;
  errorCode?: string;
  [key: string]: unknown;
}

/**
 * Generates a privacy-safe, irreversible 16-character HMAC-SHA256 pseudonym of a sensitive
 * identifier (e.g. phone number, email address) using the server-side AUTH_SECRET.
 *
 * Security Rationale:
 * Low-entropy identifiers such as 11-digit Bangladeshi mobile numbers (~7x10^7 search space)
 * are vulnerable to dictionary enumeration and precomputed rainbow tables when hashed with plain SHA-256.
 * Using HMAC-SHA256 with the server secret AUTH_SECRET prevents offline inversion while ensuring
 * deterministic pseudonyms across all application instances sharing the secret.
 *
 * Raw identifiers and the HMAC secret are never transmitted to Sentry or monitoring systems.
 */
export function hashSecurityIdentifier(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "anonymous";
  }
  const secret = env.AUTH_SECRET || "vibelock-security-logger-default-secret-salt";
  return crypto
    .createHmac("sha256", secret)
    .update(value.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

/**
 * Masks an IP address for safe telemetry logging.
 * - IPv4: masks last two octets (e.g., "192.168.1.10" -> "192.168.***.***")
 * - IPv6: masks lower halves (e.g., "2001:db8:85a3::8a2e:370:7334" -> "2001:db8:****:****")
 * - Missing/invalid: returns "unknown"
 */
export function maskIpAddress(ip: unknown): string {
  if (typeof ip !== "string" || !ip.trim()) {
    return "unknown";
  }
  const clean = ip.trim();

  // IPv4
  const ipv4Parts = clean.split(".");
  if (ipv4Parts.length === 4) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.***.***`;
  }

  // IPv6
  const ipv6Parts = clean.split(":");
  if (ipv6Parts.length >= 2) {
    return `${ipv6Parts[0]}:${ipv6Parts[1]}:****:****`;
  }

  return "masked_ip";
}

// Prohibited field name patterns (defense-in-depth)
const PROHIBITED_KEY_PATTERN =
  /(?:password|secret|token|cookie|auth|credential|card|cvv|otp|session)/i;

// Prohibited raw value patterns (emails, Bangladeshi phones, bcrypt hashes, JWTs)
const RAW_EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const RAW_BD_PHONE_PATTERN = /(?:\+?880|0)1[3-9]\d{8}/;
const RAW_JWT_PATTERN = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
const RAW_BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$/;

/**
 * Sanitizes metadata against an explicit allowlist of approved keys and scalar types.
 * Discards any unapproved keys, complex objects, or values containing raw PII / secrets.
 */
export function sanitizeSecurityMetadata(
  rawMetadata?: SecurityAlertMetadata | null
): Record<string, string | number | boolean> {
  if (!rawMetadata || typeof rawMetadata !== "object") {
    return {};
  }

  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(rawMetadata)) {
    // 1. Strict key allowlist
    if (!APPROVED_METADATA_KEYS.has(key)) {
      continue;
    }

    // 2. Prohibited key pattern check
    if (PROHIBITED_KEY_PATTERN.test(key)) {
      continue;
    }

    // 3. Scalar type checks
    if (typeof value === "number") {
      if (Number.isFinite(value)) {
        sanitized[key] = value;
      }
      continue;
    }

    if (typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();

      // Check for raw PII or secret patterns in values
      if (
        RAW_EMAIL_PATTERN.test(trimmed) ||
        RAW_BD_PHONE_PATTERN.test(trimmed) ||
        RAW_JWT_PATTERN.test(trimmed) ||
        RAW_BCRYPT_PATTERN.test(trimmed)
      ) {
        // Redact or drop if raw PII was passed into an approved key
        if (key === "phoneHash" || key === "emailHash") {
          sanitized[key] = hashSecurityIdentifier(trimmed);
        } else {
          sanitized[key] = "[REDACTED_PII]";
        }
        continue;
      }

      // Safe scrub via existing privacy infrastructure
      sanitized[key] = scrubString(trimmed);
    }
  }

  return sanitized;
}

/**
 * Logs a high-priority security event to Sentry and structured server logs.
 *
 * Guarantees:
 * 1. Strict allowlist enforcement for event names and metadata fields.
 * 2. Zero PII, secrets, credentials, or cookies are ever transmitted.
 * 3. Never throws: failures in telemetry dispatch will NEVER crash or block the caller.
 */
export function logSecurityAlert(
  eventName: SecurityEventName,
  metadata?: SecurityAlertMetadata
): void {
  try {
    // 1. Validate event name against strict allowlist
    if (!APPROVED_SECURITY_EVENT_SET.has(eventName)) {
      console.warn(
        JSON.stringify({
          event: "SECURITY_LOGGER_REJECTED",
          level: "warn",
          message: `Attempted to log unapproved security event name: ${String(eventName).slice(0, 50)}`,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 2. Sanitize metadata
    const safeMetadata = sanitizeSecurityMetadata(metadata);

    // 3. Emit structured server-side log for local and container log collection
    console.warn(
      JSON.stringify({
        event: "[SECURITY_ALERT]",
        security_event: eventName,
        ...safeMetadata,
        timestamp: new Date().toISOString(),
      })
    );

    // 4. Capture in Sentry with dedicated security tags and context
    Sentry.captureMessage(`[SECURITY_ALERT] ${eventName}`, {
      level: "warning",
      tags: {
        security_event: eventName,
        event_type: "security",
      },
      contexts: {
        security: safeMetadata,
      },
    });
  } catch (err) {
    // Fail-safe: telemetry dispatch errors must never break application operations
    try {
      console.warn(
        JSON.stringify({
          event: "SECURITY_LOGGER_DISPATCH_ERROR",
          level: "warn",
          message: "Internal error in security alert logger dispatch.",
          error: err instanceof Error ? err.message : "Unknown error",
          timestamp: new Date().toISOString(),
        })
      );
    } catch {
      // Do nothing if even console logging fails
    }
  }
}
