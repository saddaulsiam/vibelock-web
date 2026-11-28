import {
  sanitizePath,
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
  sanitizeTransaction,
  sanitizeUrl,
  scrubString,
} from "@/lib/monitoring/sentry-privacy";
import type { Breadcrumb, Event } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

describe("Sentry Privacy Sanitizer", () => {
  describe("sanitizePath", () => {
    it("preserves static routes and public catalog slugs", () => {
      expect(sanitizePath("/product/[slug]")).toBe("/product/[slug]");
      expect(sanitizePath("/product/vintage-oversized-hoodie")).toBe(
        "/product/vintage-oversized-hoodie"
      );
      expect(sanitizePath("/category/[slug]")).toBe("/category/[slug]");
      expect(sanitizePath("/category/streetwear")).toBe("/category/streetwear");
      expect(sanitizePath("/shop")).toBe("/shop");
      expect(sanitizePath("/cart")).toBe("/cart");
      expect(sanitizePath("/checkout")).toBe("/checkout");
    });

    it("preserves route templates with route groups and brackets intact", () => {
      expect(sanitizePath("/(protected)/account/orders/[orderNumber]")).toBe(
        "/(protected)/account/orders/[orderNumber]"
      );
    });

    it("redacts dynamic order IDs in runtime paths", () => {
      expect(sanitizePath("/account/orders/VL-2026-123")).toBe("/account/orders/[ORDER_ID]");
      expect(sanitizePath("/account/orders/VL-2026-123/return")).toBe(
        "/account/orders/[ORDER_ID]/return"
      );
      expect(sanitizePath("/order-success/VL-2026-123")).toBe("/order-success/[ORDER_ID]");
    });

    it("redacts dynamic inventory variant IDs and coupon IDs", () => {
      expect(sanitizePath("/inventory/var_123456")).toBe("/inventory/[VARIANT_ID]");
      expect(sanitizePath("/admin/inventory/cuid123456789012345678901")).toBe(
        "/admin/inventory/[VARIANT_ID]"
      );
      expect(sanitizePath("/coupons/DISCOUNT20")).toBe("/coupons/[COUPON_ID]");
      expect(sanitizePath("/admin/coupons/SECRET_PROMO")).toBe("/admin/coupons/[COUPON_ID]");
    });

    it("redacts customer and return IDs", () => {
      expect(sanitizePath("/admin/customers/cm123abc456def789ghi0123")).toBe(
        "/admin/customers/[CUSTOMER_ID]"
      );
      expect(sanitizePath("/account/returns/ret_987654")).toBe("/account/returns/[RETURN_ID]");
      expect(sanitizePath("/admin/returns/ret_987654")).toBe("/admin/returns/[RETURN_ID]");
    });

    it("redacts emails, phone numbers, UUIDs, and CUIDs in path segments", () => {
      expect(sanitizePath("/users/test@example.com/profile")).toBe("/users/[CUSTOMER_ID]/profile");
      expect(sanitizePath("/verify/01712345678")).toBe("/verify/[REDACTED_PII]");
      expect(sanitizePath("/verify/+8801812345678")).toBe("/verify/[REDACTED_PII]");
      expect(sanitizePath("/item/123e4567-e89b-12d3-a456-426614174000")).toBe("/item/[UUID]");
      expect(sanitizePath("/item/clx1234567890123456789012")).toBe("/item/[CUID]");
    });
  });

  describe("sanitizeUrl", () => {
    it("strips query strings, fragments, and credentials fail-closed", () => {
      expect(sanitizeUrl("https://user:pass@vibelock.bd/product/hoodie?token=secret#token")).toBe(
        "https://vibelock.bd/product/hoodie"
      );
      expect(sanitizeUrl("/shop?category=hoodies&page=2")).toBe("/shop");
      expect(sanitizeUrl("/account/orders/VL-2026-123?tab=items#section")).toBe(
        "/account/orders/[ORDER_ID]"
      );
      expect(sanitizeUrl("/category/streetwear?sort=price_asc")).toBe("/category/streetwear");
    });

    it("fails closed on malformed URLs", () => {
      expect(sanitizeUrl("http://[invalid-url]/test?secret=123")).toBe("/test");
      expect(sanitizeUrl("not-a-url?token=xyz#abc")).toBe("/not-a-url");
    });
  });

  describe("sanitizeTransaction", () => {
    it("preserves HTTP method prefix and route template without URL encoding", () => {
      expect(sanitizeTransaction("GET /product/[slug]")).toBe("GET /product/[slug]");
      expect(sanitizeTransaction("POST /api/orders/[orderNumber]")).toBe(
        "POST /api/orders/[orderNumber]"
      );
      expect(sanitizeTransaction("GET /(protected)/account/orders/[orderNumber]")).toBe(
        "GET /(protected)/account/orders/[orderNumber]"
      );
    });

    it("sanitizes runtime paths in transactions while keeping method prefix", () => {
      expect(sanitizeTransaction("GET /account/orders/VL-2026-123")).toBe(
        "GET /account/orders/[ORDER_ID]"
      );
      expect(sanitizeTransaction("POST /coupons/SECRET_PROMO")).toBe("POST /coupons/[COUPON_ID]");
    });
  });

  describe("scrubString", () => {
    it("redacts database credentials, emails, and phone numbers", () => {
      expect(
        scrubString("Connection failed: postgresql://admin:supersecret@neon.tech/vibelock")
      ).toBe("Connection failed: postgresql://admin:[REDACTED]@neon.tech/vibelock");
      expect(scrubString("Failed login for customer customer@gmail.com")).toBe(
        "Failed login for customer [REDACTED_EMAIL]"
      );
      expect(scrubString("OTP send failed to 01712345678")).toBe(
        "OTP send failed to [REDACTED_PHONE]"
      );
      expect(scrubString("OTP send failed to +8801912345678")).toBe(
        "OTP send failed to [REDACTED_PHONE]"
      );
    });
  });

  describe("sanitizeSentryEvent", () => {
    it("completely removes headers, data, env, cookies, query_string, and user", () => {
      const mockEvent: Event = {
        request: {
          url: "https://vibelock.bd/account/orders/VL-2026-123?token=secret",
          method: "POST",
          headers: {
            authorization: "Bearer secret-token",
            cookie: "session=12345",
            "x-forwarded-for": "103.1.2.3",
            "user-agent": "Mozilla/5.0",
          },
          data: { password: "123", email: "user@test.com" },
          cookies: { session: "abc" },
          env: { DATABASE_URL: "secret" },
          query_string: "token=secret",
        },
        user: {
          id: "123",
          email: "user@test.com",
          ip_address: "103.1.2.3",
        },
        transaction: "GET /product/[slug]",
        tags: {
          environment: "preview",
          release: "v1.0.0",
          custom_pii: "sensitive_value",
        },
        extra: {
          digest: "123456789",
          secretPayload: { card: "4111" },
        },
        contexts: {
          os: { name: "Windows" },
          nextjs: {
            router_kind: "app",
            router_path: "/product/[slug]",
            route_type: "render",
            request_path: "/product/oversized-hoodie?ref=ads",
            unknown_dynamic: "leak",
          },
          response: {
            headers: { "set-cookie": "secret" },
          },
        },
      };

      const sanitized = sanitizeSentryEvent(mockEvent);

      // Request
      expect(sanitized.request?.headers).toBeUndefined();
      expect(sanitized.request?.data).toBeUndefined();
      expect(sanitized.request?.cookies).toBeUndefined();
      expect(sanitized.request?.env).toBeUndefined();
      expect(sanitized.request?.query_string).toBeUndefined();
      expect(sanitized.request?.url).toBe("https://vibelock.bd/account/orders/[ORDER_ID]");

      // Transaction
      expect(sanitized.transaction).toBe("GET /product/[slug]");

      // User
      expect(sanitized.user).toBeUndefined();

      // Tags allowlist
      expect(sanitized.tags?.environment).toBe("preview");
      expect(sanitized.tags?.release).toBe("v1.0.0");
      expect(sanitized.tags?.custom_pii).toBeUndefined();

      // Extra pruning
      expect(sanitized.extra?.digest).toBe("123456789");
      expect((sanitized.extra as Record<string, unknown>)?.secretPayload).toBeUndefined();

      // Contexts
      expect(sanitized.contexts?.os).toBeDefined();
      expect(sanitized.contexts?.response).toBeUndefined();
      expect(sanitized.contexts?.nextjs).toEqual({
        router_kind: "app",
        router_path: "/product/[slug]",
        route_type: "render",
        request_path: "/product/oversized-hoodie",
      });
    });
  });

  describe("sanitizeSentryBreadcrumb", () => {
    it("cleans breadcrumb data, URLs, and messages", () => {
      const mockBreadcrumb: Breadcrumb = {
        category: "fetch",
        message: "Failed payment notification to customer@gmail.com",
        data: {
          url: "https://vibelock.bd/api/orders/VL-2026-123?token=secret",
          body: { card: "1234" },
          headers: { authorization: "Bearer xyz" },
          arguments: ["confidential"],
        },
      };

      const cleaned = sanitizeSentryBreadcrumb(mockBreadcrumb);
      expect(cleaned?.message).toBe("Failed payment notification to [REDACTED_EMAIL]");
      expect(cleaned?.data?.url).toBe("https://vibelock.bd/api/orders/[ORDER_ID]");
      expect(cleaned?.data?.body).toBeUndefined();
      expect(cleaned?.data?.headers).toBeUndefined();
      expect(cleaned?.data?.arguments).toBeUndefined();
    });
  });
});
