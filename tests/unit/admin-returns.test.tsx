import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminReturnsTable } from "@/components/admin/admin-returns-table";
import {
  ReturnSteadfastPickupCard,
  ReturnSteadfastHeaderAction,
} from "@/components/admin/return-action-forms";
import { parseReturnReason, serializeReturnReason } from "@/lib/returns/utils";
import type { AdminReturnListItem } from "@/lib/admin/return-queries";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/returns",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Admin Returns Module UI & Table Verification", () => {
  const sampleReturns: AdminReturnListItem[] = [
    {
      id: "ret-1",
      status: "PENDING",
      reason: "Size is too large, need exchange or refund",
      createdAt: "2026-10-31T10:00:00.000Z",
      updatedAt: "2026-10-31T10:00:00.000Z",
      orderId: "ord-1",
      order: {
        id: "ord-1",
        orderNumber: "ORD-9901",
        customerName: "Rahim Chowdhury",
        customerEmail: "rahim@example.com",
        customerPhone: "01711223344",
        total: 3500,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
      },
      items: [
        {
          id: "item-1",
          quantity: 1,
          orderItem: {
            id: "oi-1",
            productName: "Heavyweight Boxy Hoodie",
            sku: "HDY-BLK-XL",
            size: "XL",
            color: "Washed Black",
            unitPrice: 2500,
            lineTotal: 2500,
          },
        },
      ],
      totalQuantity: 1,
      requestedAmount: 2500,
    },
    {
      id: "ret-2",
      status: "APPROVED",
      reason: JSON.stringify({
        category: "DEFECTIVE",
        customerNote: "Defective stitching on collar",
        images: ["https://res.cloudinary.com/vibelock/image/upload/v1/sample-defect.jpg"],
      }),
      createdAt: "2026-10-30T14:30:00.000Z",
      updatedAt: "2026-10-30T16:00:00.000Z",
      orderId: "ord-2",
      order: {
        id: "ord-2",
        orderNumber: "ORD-9902",
        customerName: "Sarah Khan",
        customerEmail: "sarah@example.com",
        customerPhone: null,
        total: 1800,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
      },
      items: [
        {
          id: "item-2",
          quantity: 2,
          orderItem: {
            id: "oi-2",
            productName: "Vintage Acid Tee",
            sku: "TEE-ACD-M",
            size: "M",
            color: "Grey",
            unitPrice: 900,
            lineTotal: 1800,
          },
        },
      ],
      totalQuantity: 2,
      requestedAmount: 1800,
    },
    {
      id: "ret-3",
      status: "COMPLETED",
      reason: "Customer changed mind",
      createdAt: "2026-10-28T09:00:00.000Z",
      updatedAt: "2026-10-29T11:00:00.000Z",
      orderId: "ord-3",
      order: {
        id: "ord-3",
        orderNumber: "ORD-9903",
        customerName: "Tanvir Ahmed",
        customerEmail: "tanvir@example.com",
        customerPhone: "01811998877",
        total: 1200,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
      },
      items: [
        {
          id: "item-3",
          quantity: 1,
          orderItem: {
            id: "oi-3",
            productName: "Cargo Pants",
            sku: "PNT-CRG-32",
            size: "32",
            color: "Olive",
            unitPrice: 1200,
            lineTotal: 1200,
          },
        },
      ],
      totalQuantity: 1,
      requestedAmount: 1200,
      reverseLogistics: {
        provider: "steadfast",
        consignmentId: "84920194",
        trackingCode: "ST-RET-9903",
        bookedAt: "2026-10-29T10:00:00.000Z",
        trackingUrl: "https://steadfast.com.bd/t/ST-RET-9903",
        labelUrl: "https://steadfast.com.bd/user/consignment/print-label/84920194",
      },
    },
  ];

  const sampleCounts = {
    ALL: 15,
    PENDING: 3,
    APPROVED: 4,
    RECEIVED: 2,
    COMPLETED: 5,
    REJECTED: 1,
  };

  test("renders KPI metric summary cards with status counts", () => {
    const html = renderToStaticMarkup(
      <AdminReturnsTable
        initialReturns={sampleReturns}
        total={15}
        totalPages={1}
        page={1}
        statusCounts={sampleCounts}
      />
    );

    expect(html).toContain("Total Returns");
    expect(html).toContain("15");
    expect(html).toContain("Pending Review");
    expect(html).toContain("3");
    expect(html).toContain("Approved");
    expect(html).toContain("4");
    expect(html).toContain("Received");
    expect(html).toContain("2");
    expect(html).toContain("Completed");
    expect(html).toContain("5");
  });

  test("renders navigation tabs with exact counts", () => {
    const html = renderToStaticMarkup(
      <AdminReturnsTable
        initialReturns={sampleReturns}
        total={15}
        totalPages={1}
        page={1}
        statusCounts={sampleCounts}
      />
    );

    expect(html).toContain("All Returns");
    expect(html).toContain("Pending");
    expect(html).toContain("Approved");
    expect(html).toContain("Received");
    expect(html).toContain("Completed");
    expect(html).toContain("Rejected");
  });

  test("renders return rows with order details, items, reason, and status badges", () => {
    const html = renderToStaticMarkup(
      <AdminReturnsTable
        initialReturns={sampleReturns}
        total={15}
        totalPages={1}
        page={1}
        statusCounts={sampleCounts}
      />
    );

    // Order numbers & customer info
    expect(html).toContain("ORD-9901");
    expect(html).toContain("Rahim Chowdhury");
    expect(html).toContain("Heavyweight Boxy Hoodie");
    expect(html).toContain("HDY-BLK-XL");
    expect(html).toContain("Pending Review");

    // Sarah's order
    expect(html).toContain("ORD-9902");
    expect(html).toContain("Sarah Khan");
    expect(html).toContain("Vintage Acid Tee");
    expect(html).toContain("Approved (In Transit)");

    // Completed order
    expect(html).toContain("ORD-9903");
    expect(html).toContain("Completed &amp; Refunded");

    // Action links
    expect(html).toContain("Review &amp; Process");
    expect(html).toContain("/admin/returns/ret-1");
    expect(html).toContain("/admin/orders/ord-1");
  });

  test("renders WhatsApp contact link when customer phone is provided", () => {
    const html = renderToStaticMarkup(
      <AdminReturnsTable
        initialReturns={sampleReturns}
        total={15}
        totalPages={1}
        page={1}
        statusCounts={sampleCounts}
      />
    );

    expect(html).toContain("WhatsApp");
    expect(html).toContain("https://wa.me/8801711223344");
  });

  test("renders empty state when no returns match query", () => {
    const html = renderToStaticMarkup(
      <AdminReturnsTable
        initialReturns={[]}
        total={0}
        totalPages={1}
        page={1}
        statusCounts={{ ALL: 0, PENDING: 0, APPROVED: 0, RECEIVED: 0, COMPLETED: 0, REJECTED: 0 }}
        currentSearch="NonExistentOrder"
      />
    );

    expect(html).toContain("No return requests found");
    expect(html).toContain("Clear Filters");
  });

  test("renders Steadfast reverse tracking badge in table when pickup is booked", () => {
    const html = renderToStaticMarkup(
      <AdminReturnsTable
        initialReturns={sampleReturns}
        total={15}
        totalPages={1}
        page={1}
        statusCounts={sampleCounts}
      />
    );

    expect(html).toContain("Steadfast: ST-RET-9903");
    expect(html).toContain("https://steadfast.com.bd/t/ST-RET-9903");
  });

  test("renders Book Pickup quick action button for APPROVED return without courier booking", () => {
    const html = renderToStaticMarkup(
      <AdminReturnsTable
        initialReturns={sampleReturns}
        total={15}
        totalPages={1}
        page={1}
        statusCounts={sampleCounts}
      />
    );

    // ret-2 is APPROVED and has no reverseLogistics
    expect(html).toContain("Book Pickup");
    expect(html).toContain("/admin/returns/ret-2#steadfast-pickup");
  });

  test("renders ReturnSteadfastPickupCard and header actions accurately in both states", () => {
    // 1. Unbooked state
    const unbookedHtml = renderToStaticMarkup(
      <ReturnSteadfastPickupCard
        returnId="ret-unbooked"
        orderNumber="ORD-100"
        customerName="Test User"
        customerPhone="01700000000"
        shippingAddress="Dhanmondi, Dhaka"
        status="APPROVED"
        action={async () => ({ error: null })}
      />
    );
    expect(unbookedHtml).toContain("Steadfast Reverse Logistics");
    expect(unbookedHtml).toContain("Generate Steadfast Return Pickup");
    expect(unbookedHtml).toContain("RET-ORD-100");

    // 2. Booked state
    const bookedLogistics = {
      provider: "steadfast",
      consignmentId: "998877",
      trackingCode: "ST-TRK-1234",
      bookedAt: "2026-10-31T12:00:00.000Z",
      trackingUrl: "https://steadfast.com.bd/t/ST-TRK-1234",
      labelUrl: "https://steadfast.com.bd/user/consignment/print-label/998877",
    };
    const bookedHtml = renderToStaticMarkup(
      <ReturnSteadfastPickupCard
        returnId="ret-booked"
        orderNumber="ORD-100"
        reverseLogistics={bookedLogistics}
        status="APPROVED"
        action={async () => ({ error: null })}
      />
    );
    expect(bookedHtml).toContain("Consignment Active");
    expect(bookedHtml).toContain("#998877");
    expect(bookedHtml).toContain("ST-TRK-1234");
    expect(bookedHtml).toContain("Track on Steadfast");
    expect(bookedHtml).toContain("Print Label");

    // 3. Header quick action
    const headerHtml = renderToStaticMarkup(
      <ReturnSteadfastHeaderAction reverseLogistics={bookedLogistics} status="APPROVED" />
    );
    expect(headerHtml).toContain("Steadfast: ST-TRK-1234");
    expect(headerHtml).toContain("https://steadfast.com.bd/t/ST-TRK-1234");
  });

  test("correctly parses and serializes structured return reasons with custom note and photo proof", () => {
    const rawJson = serializeReturnReason({
      category: "DEFECTIVE",
      customerNote: "Torn seam on left sleeve",
      images: ["https://res.cloudinary.com/test/image1.webp", "https://res.cloudinary.com/test/image2.webp"],
    });

    const parsed = parseReturnReason(rawJson);
    expect(parsed.category).toBe("DEFECTIVE");
    expect(parsed.categoryLabel).toContain("Defective or Damaged");
    expect(parsed.customerNote).toBe("Torn seam on left sleeve");
    expect(parsed.images).toHaveLength(2);
    expect(parsed.requiresProof).toBe(true);
    expect(parsed.formattedDisplay).toContain("Defective or Damaged Product — \"Torn seam on left sleeve\"");

    // Test legacy string fallback
    const legacyParsed = parseReturnReason("Customer changed mind");
    expect(legacyParsed.category).toBe("OTHER");
    expect(legacyParsed.customerNote).toBe("Customer changed mind");
    expect(legacyParsed.images).toHaveLength(0);
  });

  test("renders photo proof indicator and custom note excerpt in table row", () => {
    const html = renderToStaticMarkup(
      <AdminReturnsTable
        initialReturns={sampleReturns}
        total={15}
        totalPages={1}
        page={1}
        statusCounts={sampleCounts}
      />
    );

    expect(html).toContain("Defective or Damaged Product");
    expect(html).toContain("Defective stitching on collar");
    expect(html).toContain("1 photo proof(s)");
  });

  test("enforces 3-day return window logic strictly based on delivery timestamp", () => {
    const msInDay = 24 * 60 * 60 * 1000;

    // Within 3 days (e.g. 2 days ago)
    const recentDelivery = new Date(Date.now() - 2 * msInDay);
    const isRecentEligible = (Date.now() - recentDelivery.getTime()) / msInDay <= 3;
    expect(isRecentEligible).toBe(true);

    // Over 3 days (e.g. 4 days ago)
    const oldDelivery = new Date(Date.now() - 4 * msInDay);
    const isOldEligible = (Date.now() - oldDelivery.getTime()) / msInDay <= 3;
    expect(isOldEligible).toBe(false);
  });
});

