import * as React from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/vibelock_test",
    AUTH_SECRET: "12345678901234567890123456789012",
    COURIER_WEBHOOK_SECRET: "test-steadfast-secret-key-12345",
    STEADFAST_API_KEY: "mock-key",
    STEADFAST_SECRET_KEY: "mock-secret",
    STEADFAST_BASE_URL: "https://portal.packzy.com/api/v1",
  },
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue({ id: "admin-1", name: "Super Admin", role: "ADMIN" }),
}));

vi.mock("@/lib/admin/order-actions", () => ({
  updateOrderStatusAction: vi.fn(),
  addOrderNoteAction: vi.fn(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { SteadfastCourierProvider } from "@/lib/shipping/providers/steadfast";
import {
  CANCELLATION_REASONS,
  OrderCancelModal,
  OrderCopyButton,
  OrderCustomerRiskCard,
  OrderMobileActionBar,
  OrderPickPackChecklist,
  OrderStaffNotes,
} from "@/components/admin/orders";

describe("DEEP VERIFICATION: All 6 Admin Order Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── FEATURE 1: CUSTOMER RISK & FRAUD PREVENT INTELLIGENCE ──
  describe("Feature 1: Customer Risk & Fraud Prevention Intelligence", () => {
    test("handles edge case: customer with fraud reports filed", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          total_parcels: 10,
          total_delivered: 4,
          total_cancelled: 6,
          total_fraud_reports: [{ report: "Fake order scammer" }],
        }),
      } as unknown as Response);

      const provider = new SteadfastCourierProvider("k", "s", "https://api.test");
      const res = await provider.checkCustomerRisk("01700000000");

      expect(res.success).toBe(true);
      expect(res.fraudReportsCount).toBe(1);
      expect(res.riskLevel).toBe("HIGH");
      expect(res.deliveryRatio).toBe(40);
    });

    test("handles edge case: zero previous parcels (first-time customer)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          total_parcels: 0,
          total_delivered: 0,
          total_cancelled: 0,
          total_fraud_reports: [],
        }),
      } as unknown as Response);

      const provider = new SteadfastCourierProvider("k", "s", "https://api.test");
      const res = await provider.checkCustomerRisk("01700000000");

      expect(res.success).toBe(true);
      expect(res.totalParcels).toBe(0);
      expect(res.deliveryRatio).toBe(0);
      expect(res.riskLevel).toBe("UNKNOWN");
    });

    test("renders OrderCustomerRiskCard with low risk metrics and store LTV", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderCustomerRiskCard, {
          initialProfile: {
            riskScore: "LOW_RISK",
            riskLabel: "Trusted / Verified Buyer",
            headline: "Repeat Loyal Buyer",
            recommendation: "Safe for 1-click confirmation.",
            confidenceBadge: "VERIFIED",
            storeStats: {
              totalOrders: 4,
              deliveredOrders: 4,
              cancelledOrders: 0,
              pendingOrders: 0,
              totalSpent: 8500,
              isRepeatCustomer: true,
            },
            steadfastStats: {
              success: true,
              totalParcels: 15,
              totalDelivered: 14,
              totalCancelled: 1,
              deliveryRatio: 93,
              cancellationRatio: 7,
              fraudReportsCount: 0,
              riskLevel: "LOW",
            },
            checkedAt: new Date().toISOString(),
          },
          customerPhone: "01711111111",
          orderId: "ord-1",
          orderNumber: "ORD-9999",
        })
      );

      expect(html).toContain("Customer Trust &amp; Fraud Intelligence");
      expect(html).toContain("Trusted / Verified Buyer");
      expect(html).toContain("93%");
      expect(html).toContain("৳8,500");
    });
  });

  // ── FEATURE 2: PRODUCT THUMBNAIL PREVIEWS & PICK-PACK ──
  describe("Feature 2: Product Thumbnail Previews in Pick & Pack", () => {
    test("renders product thumbnails, variant details, and SKU correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderPickPackChecklist, {
          orderId: "ord-test-1",
          items: [
            {
              id: "item-1",
              productName: "Oversized Vintage Acid Wash Tee",
              sku: "TSH-OVS-VNT-L",
              size: "L",
              color: "Washed Black",
              quantity: 2,
              unitPrice: 1200,
              lineTotal: 2400,
              imageUrl: "https://res.cloudinary.com/vibelock/image/upload/sample.jpg",
            },
          ],
        })
      );

      expect(html).toContain("Oversized Vintage Acid Wash Tee");
      expect(html).toContain("TSH-OVS-VNT-L");
      expect(html).toContain("Size: L");
      expect(html).toContain("Color: Washed Black");
      expect(html).toContain("https://res.cloudinary.com/vibelock/image/upload/sample.jpg");
      expect(html).toContain("৳2,400.00");
    });

    test("handles items without images with a clean placeholder icon", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderPickPackChecklist, {
          orderId: "ord-test-2",
          items: [
            {
              id: "item-no-img",
              productName: "Basic Boxy Tee",
              sku: "TSH-BOX-M",
              quantity: 1,
              unitPrice: 800,
              lineTotal: 800,
              imageUrl: null,
            },
          ],
        })
      );

      expect(html).toContain("Basic Boxy Tee");
      expect(html).toContain("TSH-BOX-M");
    });
  });

  // ── FEATURE 3: ONE-CLICK COPY TOOLS ──
  describe("Feature 3: One-Click Copy Tools", () => {
    test("renders copy button with icon variant and accessible title", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderCopyButton, {
          text: "+8801712345678",
          title: "Copy customer phone number",
          variant: "icon",
        })
      );

      expect(html).toContain('title="Copy customer phone number"');
      expect(html).toContain("<button");
    });

    test("renders copy button with button variant and label", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderCopyButton, {
          text: "Sector 11, Uttara, Dhaka - 1230",
          label: "Copy Full Address",
          variant: "button",
        })
      );

      expect(html).toContain("Copy Full Address");
    });
  });

  // ── FEATURE 4: STAFF INTERNAL NOTES & ACTIVITY LOG ──
  describe("Feature 4: Staff Internal Notes & Activity Log", () => {
    test("renders staff note with author badge and amber highlight", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderStaffNotes, {
          orderId: "ord-1",
          history: [
            {
              id: "h-1",
              orderId: "ord-1",
              status: "PENDING",
              notes: "[STAFF NOTE by Nazmul Hossain] Customer requested delivery after 6 PM.",
              createdAt: new Date().toISOString(),
            },
          ],
        })
      );

      expect(html).toContain("Staff Note");
      expect(html).toContain("Nazmul Hossain");
      expect(html).toContain("Customer requested delivery after 6 PM.");
    });

    test("renders quick template tags for fast note insertion", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderStaffNotes, {
          orderId: "ord-1",
          history: [],
        })
      );

      expect(html).toContain("Called &amp; Confirmed");
      expect(html).toContain("Deliver After 6 PM");
      expect(html).toContain("Call Before Delivery");
      expect(html).toContain("Gift Packaging");
      expect(html).toContain("Size Exchange Discussed");
    });
  });

  // ── FEATURE 5: MOBILE & TABLET FLOATING ACTION BAR ──
  describe("Feature 5: Mobile Floating Action Bar", () => {
    test("renders phone call dialer, WhatsApp button, and next action for PENDING order", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderMobileActionBar, {
          order: {
            id: "ord-mob-1",
            orderNumber: "ORD-1234",
            status: "PENDING",
            customerName: "Sakib Al Hasan",
            customerPhone: "01711112222",
          },
        })
      );

      expect(html).toContain('href="tel:01711112222"');
      expect(html).toContain("wa.me/8801711112222");
      expect(html).toContain("Confirm Order");
      expect(html).toContain('title="Cancel order and restock inventory"');
    });

    test("renders Move to Packing action for CONFIRMED order", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderMobileActionBar, {
          order: {
            id: "ord-mob-2",
            orderNumber: "ORD-1235",
            status: "CONFIRMED",
            customerPhone: "01811112222",
          },
        })
      );

      expect(html).toContain("Move to Packing");
    });
  });

  // ── FEATURE 6: STRUCTURED CANCELLATION & RESTOCK MODAL ──
  describe("Feature 6: Structured Cancellation & Restock Modal", () => {
    test("all cancellation reason IDs are unique and categorized", () => {
      const ids = CANCELLATION_REASONS.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      CANCELLATION_REASONS.forEach((r) => {
        expect(r.label).toBeTruthy();
        expect(r.shortLabel).toBeTruthy();
        expect(r.description).toBeTruthy();
        expect(["customer", "inventory", "logistics", "operational"]).toContain(r.category);
      });
    });

    test("renders open cancellation modal with auto-restock guarantee and action buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(OrderCancelModal, {
          orderId: "ord-cancel-1",
          orderNumber: "ORD-8888",
          isOpen: true,
          onClose: () => {},
        })
      );

      expect(html).toContain("Cancel Order &amp; Restock Inventory");
      expect(html).toContain("Automatic Inventory Restock Guaranteed");
      expect(html).toContain("Keep Order");
      expect(html).toContain("Confirm Cancellation");
    });
  });
});
