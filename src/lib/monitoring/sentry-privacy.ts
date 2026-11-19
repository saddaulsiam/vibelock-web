import type { Event, Breadcrumb } from "@sentry/nextjs";

// Safe standard diagnostic contexts only
const SAFE_CONTEXT_KEYS = new Set([
  "os",
  "browser",
  "device",
  "runtime",
  "trace",
  "nextjs",
  "app",
  "culture",
  "security",
]);

// Verified standard Sentry system tags (digest removed)
const SAFE_TAG_KEYS = new Set([
  "environment",
  "release",
  "level",
  "transaction",
  "handled",
  "mechanism",
  "runtime",
  "runtime.name",
  "server_name",
  "os.name",
  "browser.name",
  "security_event",
  "event_type",
]);

// Verified VibeLock parent segments whose dynamic child segments contain customer/order/admin IDs
const SENSITIVE_PARENT_SEGMENTS = new Set([
  "orders",
  "order-success",
  "customers",
  "returns",
  "users",
  "inventory",
  "coupons",
]);

/**
 * Route-aware pathname sanitizer:
 * - Redacts order numbers, customer IDs, variant IDs, and coupon codes in actual runtime paths.
 * - Preserves public catalog slugs (/product/oversized-hoodie, /category/streetwear).
 * - Preserves static sub-paths (/account/orders/[ORDER_ID]/return).
 * - Never malforms path slashes or drops static segments.
 */
export function sanitizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";

  const rawSegments = pathname.split("/");
  const sanitized: string[] = [];

  for (let i = 0; i < rawSegments.length; i++) {
    const segment = rawSegments[i];
    if (!segment) {
      if (i === 0 || i === rawSegments.length - 1) sanitized.push("");
      continue;
    }

    const prev = i > 0 ? rawSegments[i - 1].toLowerCase() : "";

    // 0. If segment is already a bracketed template parameter (e.g. [orderNumber], [slug]), preserve it intact
    if (segment.startsWith("[") && segment.endsWith("]")) {
      sanitized.push(segment);
      continue;
    }

    // 1. Redact dynamic ID segment following known sensitive parents
    if (SENSITIVE_PARENT_SEGMENTS.has(prev)) {
      if (prev === "customers" || prev === "users") {
        sanitized.push("[CUSTOMER_ID]");
      } else if (prev === "orders" || prev === "order-success") {
        sanitized.push("[ORDER_ID]");
      } else if (prev === "returns") {
        sanitized.push("[RETURN_ID]");
      } else if (prev === "inventory") {
        sanitized.push("[VARIANT_ID]");
      } else if (prev === "coupons") {
        sanitized.push("[COUPON_ID]");
      } else {
        sanitized.push("[ID]");
      }
      continue;
    }

    // 2. Redact email or phone numbers in paths
    if (segment.includes("@") || /(?:\+?880|0)1[3-9]\d{8}/.test(segment)) {
      sanitized.push("[REDACTED_PII]");
      continue;
    }

    // 3. Redact UUIDs
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
      sanitized.push("[UUID]");
      continue;
    }

    // 4. Redact CUIDs / MongoDB ObjectIDs (24+ alphanumeric)
    if (/^(c[a-z0-9]{24}|[0-9a-f]{24})$/i.test(segment)) {
      sanitized.push("[CUID]");
      continue;
    }

    // 5. Redact order identifiers (e.g., VL-2026-..., ORD-...)
    if (/^(VL|ORD)-[a-zA-Z0-9_-]+$/i.test(segment)) {
      sanitized.push("[ORDER_ID]");
      continue;
    }

    sanitized.push(segment);
  }

  const result = sanitized.join("/");
  return result.startsWith("/") ? result : `/${result}`;
}

/**
 * Fail-closed URL sanitizer:
 * - Strips credentials, fragments, and all query parameters.
 * - Applies route-aware pathname sanitization.
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";

  try {
    const isRelative = !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://");
    const parsed = new URL(rawUrl, "https://vibelock.bd");

    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";
    parsed.search = "";

    const cleanPath = sanitizePath(parsed.pathname);
    return isRelative ? cleanPath : `${parsed.origin}${cleanPath}`;
  } catch {
    const withoutQuery = rawUrl.split(/[?#]/)[0] || "/";
    const pathnameOnly = withoutQuery.replace(/^[a-zA-Z]+:\/\/[^/]+/, "");
    return sanitizePath(pathnameOnly || "/");
  }
}

/**
 * Sanitizes transaction names without corrupting HTTP method prefixes or route templates.
 */
export function sanitizeTransaction(transaction: string): string {
  if (!transaction || typeof transaction !== "string") return "";

  const match = transaction.match(/^([A-Z]+)\s+(.+)$/);
  if (match) {
    const method = match[1];
    const target = match[2].split(/[?#]/)[0];
    // If it's a Next.js template (contains '['), preserve template directly
    if (target.includes("[")) {
      return `${method} ${target}`;
    }
    return `${method} ${sanitizePath(target)}`;
  }

  if (transaction.includes("[")) {
    return transaction.split(/[?#]/)[0];
  }
  return sanitizePath(transaction.split(/[?#]/)[0]);
}

/**
 * Scans strings for database credentials, emails, and Bangladeshi phone numbers.
 */
export function scrubString(text: string): string {
  return text
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi, "$1[REDACTED]$2")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/(?:\+?880|0)1[3-9]\d{8}/g, "[REDACTED_PHONE]");
}

/**
 * Central event sanitizer for Sentry beforeSend.
 */
export function sanitizeSentryEvent<T extends Event>(event: T): T {
  // 1. Request Data, Headers, and Environment
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.env;
    delete event.request.query_string;

    if (typeof event.request.url === "string") {
      event.request.url = sanitizeUrl(event.request.url);
    }
  }

  // 2. Transaction Route Sanitization (Preserves method + route template safely)
  if (typeof event.transaction === "string") {
    event.transaction = sanitizeTransaction(event.transaction);
  }

  // 3. User Identifiers (Ensure zero user context is sent)
  delete event.user;

  // 4. Exception Messages (Preserves stack trace frames, file names, lines intact)
  if (Array.isArray(event.exception?.values)) {
    for (const ex of event.exception.values) {
      if (typeof ex.value === "string") {
        ex.value = scrubString(ex.value);
      }
    }
  }

  // 5. Log and Message Strings
  if (typeof event.message === "string") {
    event.message = scrubString(event.message);
  }
  if (typeof event.logentry?.message === "string") {
    event.logentry.message = scrubString(event.logentry.message);
  }

  // 6. Breadcrumbs
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((b) => {
      if (typeof b.data?.url === "string") b.data.url = sanitizeUrl(b.data.url);
      if (typeof b.data?.to === "string") b.data.to = sanitizeUrl(b.data.to);
      if (typeof b.data?.from === "string") b.data.from = sanitizeUrl(b.data.from);
      if (typeof b.message === "string") b.message = scrubString(b.message);
      if (b.data && typeof b.data === "object") {
        delete (b.data as Record<string, unknown>).headers;
        delete (b.data as Record<string, unknown>).body;
        delete (b.data as Record<string, unknown>).data;
        delete (b.data as Record<string, unknown>).params;
        delete (b.data as Record<string, unknown>).query;
        delete (b.data as Record<string, unknown>).arguments;
        delete (b.data as Record<string, unknown>).cookies;
      }
      return b;
    });
  }

  // 7. Contexts Allowlisting & Verified Next.js Scalar Fields Only
  if (event.contexts && typeof event.contexts === "object") {
    for (const key of Object.keys(event.contexts)) {
      if (!SAFE_CONTEXT_KEYS.has(key)) {
        delete event.contexts[key];
      }
    }

    if (event.contexts.nextjs && typeof event.contexts.nextjs === "object") {
      const rawNextjs = event.contexts.nextjs as Record<string, unknown>;
      const safeNextjs: Record<string, string> = {};

      if (typeof rawNextjs.router_kind === "string") {
        safeNextjs.router_kind = rawNextjs.router_kind;
      }
      if (typeof rawNextjs.router_path === "string") {
        safeNextjs.router_path = rawNextjs.router_path.split(/[?#]/)[0];
      }
      if (typeof rawNextjs.route_type === "string") {
        safeNextjs.route_type = rawNextjs.route_type;
      }
      if (typeof rawNextjs.request_path === "string") {
        safeNextjs.request_path = sanitizeUrl(rawNextjs.request_path);
      }

      event.contexts.nextjs = safeNextjs;
    } else {
      delete event.contexts.nextjs;
    }

    if (event.contexts.security && typeof event.contexts.security === "object") {
      const rawSec = event.contexts.security as Record<string, unknown>;
      const safeSec: Record<string, string | number | boolean> = {};
      const ALLOWED_SEC_KEYS = new Set([
        "endpoint",
        "attemptCount",
        "windowSeconds",
        "role",
        "reason",
        "phoneHash",
        "emailHash",
        "ipMasked",
        "status",
      ]);

      for (const [k, v] of Object.entries(rawSec)) {
        if (!ALLOWED_SEC_KEYS.has(k)) continue;
        if (typeof v === "number" && Number.isFinite(v)) {
          safeSec[k] = v;
        } else if (typeof v === "boolean") {
          safeSec[k] = v;
        } else if (typeof v === "string") {
          safeSec[k] = scrubString(v);
        }
      }

      event.contexts.security = safeSec;
    } else {
      delete event.contexts.security;
    }
  }

  // 8. Tags Allowlisting (digest removed)
  if (event.tags && typeof event.tags === "object" && !Array.isArray(event.tags)) {
    const tagsObj = event.tags as Record<string, unknown>;
    for (const tagKey of Object.keys(tagsObj)) {
      if (!SAFE_TAG_KEYS.has(tagKey)) {
        delete tagsObj[tagKey];
      }
    }
  }

  // 9. Extra Pruning (Retain scalar digest only, drop arbitrary objects)
  if (event.extra && typeof event.extra === "object") {
    const digestValue = (event.extra as Record<string, unknown>).digest;
    if (typeof digestValue === "string") {
      event.extra = { digest: digestValue };
    } else {
      delete event.extra;
    }
  }

  return event;
}

/**
 * Filter for breadcrumbs in Sentry.init
 */
export function sanitizeSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (typeof breadcrumb.data?.url === "string") breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
  if (typeof breadcrumb.data?.to === "string") breadcrumb.data.to = sanitizeUrl(breadcrumb.data.to);
  if (typeof breadcrumb.data?.from === "string") breadcrumb.data.from = sanitizeUrl(breadcrumb.data.from);
  if (typeof breadcrumb.message === "string") breadcrumb.message = scrubString(breadcrumb.message);
  if (breadcrumb.data && typeof breadcrumb.data === "object") {
    delete (breadcrumb.data as Record<string, unknown>).headers;
    delete (breadcrumb.data as Record<string, unknown>).body;
    delete (breadcrumb.data as Record<string, unknown>).data;
    delete (breadcrumb.data as Record<string, unknown>).params;
    delete (breadcrumb.data as Record<string, unknown>).query;
    delete (breadcrumb.data as Record<string, unknown>).arguments;
    delete (breadcrumb.data as Record<string, unknown>).cookies;
  }
  return breadcrumb;
}
