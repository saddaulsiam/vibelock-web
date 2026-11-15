import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { GET as searchGet } from "@/app/api/search/route";
import { POST as steadfastWebhookPost } from "@/app/api/shipping/webhook/steadfast/route";
import { GET as inventoryExportGet } from "@/app/api/admin/inventory/export/route";
import { GET as reportsExportGet } from "@/app/api/admin/reports/export/route";
import { GET as inventoryIntelligenceExportGet } from "@/app/api/admin/inventory-intelligence/export/route";
import { resetRateLimitMemoryStore } from "@/lib/security/rate-limit";
import { AuthRequiredError, ForbiddenError } from "@/lib/auth/authorization";
import { PaymentService } from "@/lib/payment/service";

// Hoisted mock state
const {
  mockRequireRole,
  mockFindManyProducts,
  mockFindUniquePayment,
  mockFindUniqueOrder,
  mockGetAdminInventoryForExport,
  mockGetAdminReport,
  mockGetAdminOrderProfitability,
  mockGetAdminInventoryIntelligenceForExport,
} = vi.hoisted(() => ({
  mockRequireRole: vi.fn(),
  mockFindManyProducts: vi.fn(),
  mockFindUniquePayment: vi.fn(),
  mockFindUniqueOrder: vi.fn(),
  mockGetAdminInventoryForExport: vi.fn(),
  mockGetAdminReport: vi.fn(),
  mockGetAdminOrderProfitability: vi.fn(),
  mockGetAdminInventoryIntelligenceForExport: vi.fn(),
}));

// Mock prisma client
vi.mock("@/lib/prisma/client", () => ({
  default: {
    product: {
      findMany: (...args: unknown[]) => mockFindManyProducts(...args),
    },
    payment: {
      findUnique: (...args: unknown[]) => mockFindUniquePayment(...args),
    },
    order: {
      findUnique: (...args: unknown[]) => mockFindUniqueOrder(...args),
    },
    shipment: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Mock authorization
vi.mock("@/lib/auth/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/authorization")>();
  return {
    ...actual,
    requireRole: (...args: unknown[]) => mockRequireRole(...args),
  };
});

// Mock admin exports
vi.mock("@/lib/admin/inventory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/inventory")>();
  return {
    ...actual,
    getAdminInventoryForExport: (...args: unknown[]) => mockGetAdminInventoryForExport(...args),
    getAdminInventoryIntelligenceForExport: (...args: unknown[]) =>
      mockGetAdminInventoryIntelligenceForExport(...args),
  };
});

vi.mock("@/lib/admin/reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/reports")>();
  return {
    ...actual,
    getAdminReport: (...args: unknown[]) => mockGetAdminReport(...args),
    getAdminOrderProfitability: (...args: unknown[]) => mockGetAdminOrderProfitability(...args),
  };
});

// Mock env
vi.mock("@/lib/config/env", () => ({
  env: {
    COURIER_WEBHOOK_SECRET: "test-steadfast-secret-key-32chars!!",
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
  },
}));

describe("Phase 6: API & Input Security Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitMemoryStore();
  });

  // =========================================================================
  // 1. Search API Hardening (/api/search)
  // =========================================================================
  describe("1. Public Search API (/api/search)", () => {
    it("returns empty product list for empty or missing search query", async () => {
      const req = new NextRequest("http://localhost:3000/api/search");
      const res = await searchGet(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ products: [] });
      expect(mockFindManyProducts).not.toHaveBeenCalled();
    });

    it("returns mapped products for valid bounded query", async () => {
      mockFindManyProducts.mockResolvedValueOnce([
        {
          id: "prod-1",
          name: "Cyber Hoodie",
          slug: "cyber-hoodie",
          price: 1500,
          compareAtPrice: 1800,
          status: "PUBLISHED",
          images: [{ url: "/img1.jpg", alt: "Hoodie" }],
          categories: [{ id: "c1", name: "Hoodies", slug: "hoodies" }],
          variants: [
            {
              id: "v1",
              price: 1500,
              compareAtPrice: 1800,
              inventoryTransactions: [{ quantity: 10 }],
              inventoryReservations: [],
            },
          ],
        },
      ]);

      const req = new NextRequest("http://localhost:3000/api/search?q=hoodie");
      const res = await searchGet(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.products).toHaveLength(1);
      expect(json.products[0].name).toBe("Cyber Hoodie");
      expect(mockFindManyProducts).toHaveBeenCalledTimes(1);
    });

    it("rejects search query exceeding 100 characters with 400 Bad Request", async () => {
      const oversized = "a".repeat(101);
      const req = new NextRequest(`http://localhost:3000/api/search?q=${oversized}`);
      const res = await searchGet(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid search query. Maximum length is 100 characters.");
      expect(mockFindManyProducts).not.toHaveBeenCalled();
    });

    it("enforces sliding-window rate limiting (60 req/min) on search endpoint", async () => {
      const clientIp = "192.168.1.100";

      // 60 requests should pass
      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: { "x-real-ip": clientIp },
        });
        mockFindManyProducts.mockResolvedValueOnce([]);
        const res = await searchGet(req);
        expect(res.status).toBe(200);
      }

      // 61st request from same IP must be rate-limited with 429
      const throttledReq = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-real-ip": clientIp },
      });
      const throttledRes = await searchGet(throttledReq);
      const throttledJson = await throttledRes.json();

      expect(throttledRes.status).toBe(429);
      expect(throttledJson.error).toBe("Too many requests. Please slow down.");
    });

    it("isolates rate limiting per client IP so distinct IPs are not blocked", async () => {
      const ipA = "192.168.1.101";
      const ipB = "192.168.1.102";

      // Exhaust IP A
      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: { "x-real-ip": ipA },
        });
        mockFindManyProducts.mockResolvedValueOnce([]);
        await searchGet(req);
      }

      // IP A is blocked
      const reqA = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-real-ip": ipA },
      });
      const resA = await searchGet(reqA);
      expect(resA.status).toBe(429);

      // IP B is still allowed
      mockFindManyProducts.mockResolvedValueOnce([]);
      const reqB = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-real-ip": ipB },
      });
      const resB = await searchGet(reqB);
      expect(resB.status).toBe(200);
    });

    // =======================================================================
    // SEC-6-01: Reverse-Proxy IP Extraction & Precedence Hardening
    // =======================================================================
    it("correctly extracts the last non-empty entry from a multi-hop X-Forwarded-For chain", async () => {
      // Proxy chain: client -> proxy1 -> proxy2 -> edge
      // Attacker controls first entry, proxy appends last entry
      const forgedChain = "198.51.100.1, 203.0.113.195, 192.0.2.55";

      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: { "x-forwarded-for": forgedChain },
        });
        mockFindManyProducts.mockResolvedValueOnce([]);
        const res = await searchGet(req);
        expect(res.status).toBe(200);
      }

      // 61st request with identical last IP should be rate-limited (429)
      const throttledReq = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-forwarded-for": forgedChain },
      });
      const throttledRes = await searchGet(throttledReq);
      expect(throttledRes.status).toBe(429);

      // Request with different last IP but SAME forged first IP must succeed
      // (proves rate limiting is keyed on last IP 192.0.2.55, not forged first IP 198.51.100.1)
      const differentLastIpChain = "198.51.100.1, 203.0.113.195, 192.0.2.99";
      mockFindManyProducts.mockResolvedValueOnce([]);
      const allowedReq = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-forwarded-for": differentLastIpChain },
      });
      const allowedRes = await searchGet(allowedReq);
      expect(allowedRes.status).toBe(200);
    });

    it("gracefully handles empty or whitespace-only X-Forwarded-For header", async () => {
      mockFindManyProducts.mockResolvedValueOnce([]);
      const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-forwarded-for": "  ,  ,  " },
      });
      const res = await searchGet(req);
      expect(res.status).toBe(200);
    });

    it("handles missing X-Forwarded-For header and falls back safely", async () => {
      mockFindManyProducts.mockResolvedValueOnce([]);
      const req = new NextRequest("http://localhost:3000/api/search?q=tee");
      const res = await searchGet(req);
      expect(res.status).toBe(200);
    });

    it("enforces x-real-ip precedence over X-Forwarded-For chain", async () => {
      const realIp = "10.0.0.88";
      const spoofedChain = "198.51.100.1, 203.0.113.195";

      // Exhaust quota under x-real-ip
      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: {
            "x-real-ip": realIp,
            "x-forwarded-for": spoofedChain,
          },
        });
        mockFindManyProducts.mockResolvedValueOnce([]);
        const res = await searchGet(req);
        expect(res.status).toBe(200);
      }

      // 61st request should be rate-limited by x-real-ip even if x-forwarded-for changes
      const throttledReq = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          "x-real-ip": realIp,
          "x-forwarded-for": "172.16.0.1, 172.16.0.2",
        },
      });
      const throttledRes = await searchGet(throttledReq);
      expect(throttledRes.status).toBe(429);
    });
  });

  // =========================================================================
  // 2. Steadfast Shipping Webhook Hardening
  // =========================================================================
  describe("2. Steadfast Shipping Webhook (/api/shipping/webhook/steadfast)", () => {
    const SECRET = "test-steadfast-secret-key-32chars!!";

    it("rejects unauthorized webhook request with 401 when no auth header is provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/shipping/webhook/steadfast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "delivered", consignment_id: "12345" }),
      });

      const res = await steadfastWebhookPost(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized Steadfast webhook request");
    });

    it("accepts valid Bearer token via constant-time comparison", async () => {
      const req = new NextRequest("http://localhost:3000/api/shipping/webhook/steadfast", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${SECRET}`,
        },
        body: JSON.stringify({ notification_type: "ping" }),
      });

      const res = await steadfastWebhookPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe("Steadfast webhook ping acknowledged");
    });

    it("rejects invalid Bearer token of same length via constant-time comparison with 401", async () => {
      const wrongToken = "x".repeat(SECRET.length);
      const req = new NextRequest("http://localhost:3000/api/shipping/webhook/steadfast", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${wrongToken}`,
        },
        body: JSON.stringify({ notification_type: "ping" }),
      });

      const res = await steadfastWebhookPost(req);
      expect(res.status).toBe(401);
    });

    it("accepts valid HMAC signature in x-signature header", async () => {
      const body = JSON.stringify({ notification_type: "ping" });
      const signature = crypto.createHmac("sha256", SECRET).update(body).digest("hex");

      const req = new NextRequest("http://localhost:3000/api/shipping/webhook/steadfast", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-signature": signature,
        },
        body,
      });

      const res = await steadfastWebhookPost(req);
      expect(res.status).toBe(200);
    });

    it("rejects invalid HMAC signature with 401", async () => {
      const body = JSON.stringify({ notification_type: "ping" });
      const invalidSignature = "a".repeat(64);

      const req = new NextRequest("http://localhost:3000/api/shipping/webhook/steadfast", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-signature": invalidSignature,
        },
        body,
      });

      const res = await steadfastWebhookPost(req);
      expect(res.status).toBe(401);
    });

    it("rejects non-hex malformed HMAC signature with 401", async () => {
      const body = JSON.stringify({ notification_type: "ping" });
      const malformedSignature = "not-a-valid-hex-signature-at-all!";

      const req = new NextRequest("http://localhost:3000/api/shipping/webhook/steadfast", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-signature": malformedSignature,
        },
        body,
      });

      const res = await steadfastWebhookPost(req);
      expect(res.status).toBe(401);
    });

    it("rejects malformed JSON body with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/shipping/webhook/steadfast", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${SECRET}`,
        },
        body: "{ not valid json ",
      });

      const res = await steadfastWebhookPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("rejects oversized field payloads violating schema with 400 Bad Request", async () => {
      const oversizedCid = "x".repeat(101);
      const req = new NextRequest("http://localhost:3000/api/shipping/webhook/steadfast", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${SECRET}`,
        },
        body: JSON.stringify({
          consignment_id: oversizedCid,
          status: "in_transit",
        }),
      });

      const res = await steadfastWebhookPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid payload format");
    });
  });

  // =========================================================================
  // 3. Admin Inventory Export (/api/admin/inventory/export)
  // =========================================================================
  describe("3. Admin Inventory Export (/api/admin/inventory/export)", () => {
    it("enforces authentication and authorization (requires MANAGER role)", async () => {
      mockRequireRole.mockRejectedValueOnce(new ForbiddenError("Forbidden"));

      const req = new NextRequest("http://localhost:3000/api/admin/inventory/export");
      const res = await inventoryExportGet(req);

      expect(res.status).toBe(403);
    });

    it("rejects oversized search query with 400 Bad Request", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });

      const oversizedSearch = "s".repeat(101);
      const req = new NextRequest(
        `http://localhost:3000/api/admin/inventory/export?q=${oversizedSearch}`
      );
      const res = await inventoryExportGet(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid export query parameters");
      expect(mockGetAdminInventoryForExport).not.toHaveBeenCalled();
    });

    it("rejects invalid inventory filter with 400 Bad Request", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/inventory/export?filter=unsupported_filter"
      );
      const res = await inventoryExportGet(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid export query parameters");
      expect(mockGetAdminInventoryForExport).not.toHaveBeenCalled();
    });

    it("accepts valid parameters and generates CSV with correct security headers", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });
      mockGetAdminInventoryForExport.mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        limit: 5000,
        isTruncated: false,
      });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/inventory/export?filter=low-stock&q=TEE"
      );
      const res = await inventoryExportGet(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/csv");
      expect(res.headers.get("content-disposition")).toContain("vibelock-inventory-");
      expect(mockGetAdminInventoryForExport).toHaveBeenCalledWith({
        search: "TEE",
        filter: "low-stock",
      });
    });
  });

  // =========================================================================
  // 4. Admin Reports Export (/api/admin/reports/export)
  // =========================================================================
  describe("4. Admin Reports Export (/api/admin/reports/export)", () => {
    it("enforces authentication and authorization (requires MANAGER role)", async () => {
      mockRequireRole.mockRejectedValueOnce(new AuthRequiredError("Unauthorized"));

      const req = new NextRequest("http://localhost:3000/api/admin/reports/export");
      const res = await reportsExportGet(req);

      expect(res.status).toBe(401);
    });

    it("rejects invalid report type with 400 Bad Request", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/reports/export?type=arbitrary_type"
      );
      const res = await reportsExportGet(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid export parameters");
      expect(mockGetAdminReport).not.toHaveBeenCalled();
    });

    it("rejects invalid date format in from/to query parameters with 400 Bad Request", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/reports/export?from=2026/11/15&to=invalid-date"
      );
      const res = await reportsExportGet(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid export parameters");
      expect(mockGetAdminReport).not.toHaveBeenCalled();
    });

    it("rejects oversized search query with 400 Bad Request", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });

      const req = new NextRequest(
        `http://localhost:3000/api/admin/reports/export?q=${"x".repeat(101)}`
      );
      const res = await reportsExportGet(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid export parameters");
      expect(mockGetAdminReport).not.toHaveBeenCalled();
    });

    it("accepts valid parameters and generates sales report CSV", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });
      mockGetAdminReport.mockResolvedValueOnce({
        trend: [],
        products: [],
        start: new Date("2026-10-01"),
        end: new Date("2026-10-31"),
      });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/reports/export?type=sales&range=30d"
      );
      const res = await reportsExportGet(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/csv");
      expect(res.headers.get("content-disposition")).toContain("vibelock-sales-report-");
    });
  });

  // =========================================================================
  // 5. Admin Inventory Intelligence Export
  // =========================================================================
  describe("5. Admin Inventory Intelligence Export (/api/admin/inventory-intelligence/export)", () => {
    it("enforces authentication and authorization (requires MANAGER role)", async () => {
      mockRequireRole.mockRejectedValueOnce(new ForbiddenError("Forbidden"));

      const req = new NextRequest("http://localhost:3000/api/admin/inventory-intelligence/export");
      const res = await inventoryIntelligenceExportGet(req);

      expect(res.status).toBe(403);
    });

    it("rejects invalid window parameter with 400 Bad Request", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/inventory-intelligence/export?window=365d"
      );
      const res = await inventoryIntelligenceExportGet(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid export query parameters");
      expect(mockGetAdminInventoryIntelligenceForExport).not.toHaveBeenCalled();
    });

    it("rejects invalid status filter with 400 Bad Request", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/inventory-intelligence/export?status=invalid_status"
      );
      const res = await inventoryIntelligenceExportGet(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid export query parameters");
      expect(mockGetAdminInventoryIntelligenceForExport).not.toHaveBeenCalled();
    });

    it("rejects oversized search parameter with 400 Bad Request", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });

      const req = new NextRequest(
        `http://localhost:3000/api/admin/inventory-intelligence/export?q=${"z".repeat(101)}`
      );
      const res = await inventoryIntelligenceExportGet(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid export query parameters");
      expect(mockGetAdminInventoryIntelligenceForExport).not.toHaveBeenCalled();
    });

    it("accepts valid parameters and generates intelligence CSV", async () => {
      mockRequireRole.mockResolvedValueOnce({ id: "admin-1", role: "MANAGER" });
      mockGetAdminInventoryIntelligenceForExport.mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        limit: 5000,
        isTruncated: false,
        window: "30d",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/inventory-intelligence/export?window=30d&status=healthy&sort=valuation"
      );
      const res = await inventoryIntelligenceExportGet(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/csv");
      expect(res.headers.get("content-disposition")).toContain("vibelock-inventory-intelligence-30d-");
      expect(mockGetAdminInventoryIntelligenceForExport).toHaveBeenCalledWith({
        window: "30d",
        status: "healthy",
        search: undefined,
        sort: "valuation",
      });
    });
  });

  // =========================================================================
  // 6. Payment Reference Input Validation (PaymentService.verifyCallback)
  // =========================================================================
  describe("6. Payment Reference Input Hardening (PaymentService.verifyCallback)", () => {
    it("rejects missing transaction reference with error", async () => {
      const service = new PaymentService();
      await expect(service.verifyCallback("BKASH", {})).rejects.toThrow(
        "Missing transaction reference"
      );
    });

    it("rejects whitespace-only transaction reference with error", async () => {
      const service = new PaymentService();
      await expect(service.verifyCallback("BKASH", { paymentID: "   " })).rejects.toThrow(
        "Missing transaction reference"
      );
    });

    it("rejects oversized transaction reference (>128 chars) before database query", async () => {
      const service = new PaymentService();
      const oversizedRef = "TXN-" + "A".repeat(130);

      await expect(
        service.verifyCallback("SSLCOMMERZ", { tran_id: oversizedRef })
      ).rejects.toThrow("Invalid transaction reference");

      // Verify no database lookup occurred
      expect(mockFindUniquePayment).not.toHaveBeenCalled();
    });
  });
});

