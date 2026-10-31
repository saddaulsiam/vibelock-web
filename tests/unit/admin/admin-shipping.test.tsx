import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShipmentStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { AdminShipmentsTable } from "@/components/admin/shipping";
import {
  isShipmentInTransit,
  isShipmentReturnedOrFailed,
  getShipmentStatusBadgeInfo,
  type AdminShipmentListItem,
} from "@/lib/admin/shipping";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/shipping",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Admin Shipping & Delivery Logistics Module", () => {
  const sampleShipments: AdminShipmentListItem[] = [
    {
      id: "ship-1",
      orderId: "order-101",
      orderNumber: "ORD-2026-001",
      customerName: "Rahim Uddin",
      customerEmail: "rahim@example.com",
      customerPhone: "01712345678",
      shippingMethodName: "Inside Dhaka Standard",
      shippingAmount: 60,
      orderTotal: 1560,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.PENDING,
      provider: "STEADFAST",
      providerShipmentId: "ST-889922",
      trackingNumber: "ST-889922",
      status: ShipmentStatus.IN_TRANSIT,
      failureReason: null,
      createdAt: new Date("2026-10-25T10:00:00Z"),
      updatedAt: new Date("2026-10-25T12:00:00Z"),
      shippedAt: new Date("2026-10-25T11:00:00Z"),
      deliveredAt: null,
      cancelledAt: null,
    },
    {
      id: "ship-2",
      orderId: "order-102",
      orderNumber: "ORD-2026-002",
      customerName: "Fatema Begum",
      customerEmail: "fatema@example.com",
      customerPhone: "01812345678",
      shippingMethodName: "Outside Dhaka Express",
      shippingAmount: 120,
      orderTotal: 3450,
      paymentMethod: PaymentMethod.ONLINE,
      paymentStatus: PaymentStatus.SUCCESS,
      provider: "STEADFAST",
      providerShipmentId: "ST-889923",
      trackingNumber: "ST-889923",
      status: ShipmentStatus.DELIVERED,
      failureReason: null,
      createdAt: new Date("2026-10-24T08:00:00Z"),
      updatedAt: new Date("2026-10-25T14:00:00Z"),
      shippedAt: new Date("2026-10-24T10:00:00Z"),
      deliveredAt: new Date("2026-10-25T14:00:00Z"),
      cancelledAt: null,
    },
    {
      id: "ship-3",
      orderId: "order-103",
      orderNumber: "ORD-2026-003",
      customerName: "Shakib Al Hasan",
      customerEmail: "shakib@example.com",
      customerPhone: "01912345678",
      shippingMethodName: "Manual Delivery",
      shippingAmount: 50,
      orderTotal: 2100,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.PENDING,
      provider: "MANUAL",
      providerShipmentId: null,
      trackingNumber: null,
      status: ShipmentStatus.RETURNED,
      failureReason: "Customer refused delivery due to delay",
      createdAt: new Date("2026-10-23T09:00:00Z"),
      updatedAt: new Date("2026-10-25T16:00:00Z"),
      shippedAt: new Date("2026-10-23T11:00:00Z"),
      deliveredAt: null,
      cancelledAt: null,
    },
  ];

  describe("Status Predicates & Badges", () => {
    test("isShipmentInTransit correctly identifies transit statuses", () => {
      expect(isShipmentInTransit(ShipmentStatus.IN_TRANSIT)).toBe(true);
      expect(isShipmentInTransit(ShipmentStatus.OUT_FOR_DELIVERY)).toBe(true);
      expect(isShipmentInTransit(ShipmentStatus.PICKED_UP)).toBe(true);
      expect(isShipmentInTransit(ShipmentStatus.CREATED)).toBe(true);
      expect(isShipmentInTransit(ShipmentStatus.DELIVERED)).toBe(false);
      expect(isShipmentInTransit(ShipmentStatus.RETURNED)).toBe(false);
      expect(isShipmentInTransit(ShipmentStatus.PENDING)).toBe(false);
    });

    test("isShipmentReturnedOrFailed identifies return and failure states", () => {
      expect(isShipmentReturnedOrFailed(ShipmentStatus.RETURNED)).toBe(true);
      expect(isShipmentReturnedOrFailed(ShipmentStatus.FAILED)).toBe(true);
      expect(isShipmentReturnedOrFailed(ShipmentStatus.CANCELLED)).toBe(true);
      expect(isShipmentReturnedOrFailed(ShipmentStatus.DELIVERED)).toBe(false);
      expect(isShipmentReturnedOrFailed(ShipmentStatus.IN_TRANSIT)).toBe(false);
    });

    test("getShipmentStatusBadgeInfo returns appropriate styling and label", () => {
      const delivered = getShipmentStatusBadgeInfo(ShipmentStatus.DELIVERED);
      expect(delivered.label).toBe("Delivered");
      expect(delivered.tone).toBe("emerald");

      const inTransit = getShipmentStatusBadgeInfo(ShipmentStatus.IN_TRANSIT);
      expect(inTransit.label).toBe("In Transit");
      expect(inTransit.tone).toBe("purple");

      const returned = getShipmentStatusBadgeInfo(ShipmentStatus.RETURNED);
      expect(returned.label).toBe("Returned (RTO)");
      expect(returned.tone).toBe("rose");
    });
  });

  describe("AdminShipmentsTable Component", () => {
    test("renders table headers, parcels, tabs, and action elements", () => {
      const html = renderToStaticMarkup(
        <AdminShipmentsTable
          initialShipments={sampleShipments}
          total={3}
          segmentCounts={{
            all: 3,
            in_transit: 1,
            delivered: 1,
            returned: 1,
            pending: 0,
          }}
          currentFilter="all"
          currentSearch=""
        />
      );

      // Verify tabs
      expect(html).toContain("All Shipments");
      expect(html).toContain("In Transit");
      expect(html).toContain("Delivered");
      expect(html).toContain("Returned (RTO)");

      // Verify order numbers
      expect(html).toContain("ORD-2026-001");
      expect(html).toContain("ORD-2026-002");
      expect(html).toContain("ORD-2026-003");

      // Verify customers and phones
      expect(html).toContain("Rahim Uddin");
      expect(html).toContain("01712345678");
      expect(html).toContain("Fatema Begum");
      expect(html).toContain("Shakib Al Hasan");

      // Verify courier info & tracking
      expect(html).toContain("STEADFAST");
      expect(html).toContain("ST-889922");
      expect(html).toContain("MANUAL");

      // Verify amounts
      expect(html).toContain("৳60");
      expect(html).toContain("৳1,560");

      // Verify counter
      expect(html).toContain("Showing");
      expect(html).toContain("shipments");

      // Verify search input with / hint
      expect(html).toContain("Search tracking, order #, or customer... (Press / to focus)");
      expect(html).toContain("Export CSV");
    });

    test("renders empty state when no shipments match filters", () => {
      const html = renderToStaticMarkup(
        <AdminShipmentsTable
          initialShipments={[]}
          total={0}
          segmentCounts={{
            all: 0,
            in_transit: 0,
            delivered: 0,
            returned: 0,
            pending: 0,
          }}
          currentFilter="all"
          currentSearch="NonExistent"
        />
      );

      expect(html).toContain("No shipments found");
      expect(html).toContain("Try clearing your search query or filter settings");
    });
  });

  describe("ShippingSubNav", () => {
    test("renders all three sub navigation tabs with correct links", async () => {
      const { ShippingSubNav } = await import("@/components/admin/shipping");
      const html = renderToStaticMarkup(<ShippingSubNav activeTab="shipments" />);

      expect(html).toContain("Live Shipments &amp; Dispatch");
      expect(html).toContain("/admin/shipping");
      expect(html).toContain("Delivery Zones");
      expect(html).toContain("/admin/shipping/zones");
      expect(html).toContain("Shipping Rates &amp; Methods");
      expect(html).toContain("/admin/shipping/methods");
    });
  });
});
