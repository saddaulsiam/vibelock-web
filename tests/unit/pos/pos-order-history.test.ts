import { describe, expect, test, vi, beforeEach } from "vitest";
import { getPosTodayOrdersAction } from "@/lib/pos/pos-order-history-actions";
import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";

// Mock auth
vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue({
    id: "user-staff-1",
    name: "Staff Cashier",
    email: "cashier@vibelock.com",
    role: "STAFF",
  }),
}));

// Mock prisma client
vi.mock("@/lib/prisma/client", () => {
  return {
    default: {
      order: {
        findMany: vi.fn(),
      },
    },
    Prisma: {},
  };
});

describe("POS System - getPosTodayOrdersAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("fetches today's orders and calculates financial summaries accurately", async () => {
    const mockDbOrders = [
      {
        id: "ord-1",
        orderNumber: "VL-POS-20261101-01",
        createdAt: new Date("2026-11-01T10:30:00Z"),
        customerName: "Rahim Uddin",
        customerPhone: "01711223344",
        status: "DELIVERED",
        subtotal: 2500,
        discount: 200,
        total: 2300,
        items: [
          {
            productName: "Oversized Tee",
            sku: "VL-TEE-WHT-L",
            size: "L",
            color: "White",
            unitPrice: 1250,
            quantity: 2,
            lineTotal: 2500,
          },
        ],
        payments: [
          {
            gateway: "CASH",
            gatewayPayload: {
              tenderAmount: 2500,
              changeReturned: 200,
              cashierName: "Staff Cashier",
            },
          },
        ],
        user: {
          name: "Staff Cashier",
          email: "cashier@vibelock.com",
        },
      },
      {
        id: "ord-2",
        orderNumber: "VL-POS-20261101-02",
        createdAt: new Date("2026-11-01T11:45:00Z"),
        customerName: "Nusrat Jahan",
        customerPhone: "01811998877",
        status: "DELIVERED",
        subtotal: 1800,
        discount: 0,
        total: 1800,
        items: [
          {
            productName: "Cargo Pants",
            sku: "VL-CARGO-BLK-32",
            size: "32",
            color: "Black",
            unitPrice: 1800,
            quantity: 1,
            lineTotal: 1800,
          },
        ],
        payments: [
          {
            gateway: "BKASH",
            gatewayPayload: {
              tenderAmount: 1800,
              changeReturned: 0,
              cashierName: "Staff Cashier",
            },
          },
        ],
        user: {
          name: "Staff Cashier",
          email: "cashier@vibelock.com",
        },
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(
      mockDbOrders as unknown as Awaited<ReturnType<typeof prisma.order.findMany>>
    );

    const result = await getPosTodayOrdersAction();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const data = result.data!;
    expect(data.orders).toHaveLength(2);
    expect(data.stats.totalOrders).toBe(2);
    expect(data.stats.totalRevenue).toBe(4100); // 2300 + 1800
    expect(data.stats.cashTotal).toBe(2300);
    expect(data.stats.digitalTotal).toBe(1800);

    // Verify first order details and reprint receipt format
    const firstOrder = data.orders[0];
    expect(firstOrder.orderNumber).toBe("VL-POS-20261101-01");
    expect(firstOrder.paymentMethod).toBe("CASH");
    expect(firstOrder.amountPaid).toBe(2500);
    expect(firstOrder.changeDue).toBe(200);
    expect(firstOrder.receiptData.items).toHaveLength(1);
    expect(firstOrder.receiptData.items[0].name).toBe("Oversized Tee");
  });

  test("passes search query parameter to prisma findMany", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const result = await getPosTodayOrdersAction("01711223344");

    expect(result.success).toBe(true);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          salesChannel: "POS",
          OR: [
            { orderNumber: { contains: "01711223344", mode: "insensitive" } },
            { customerPhone: { contains: "01711223344", mode: "insensitive" } },
            { customerName: { contains: "01711223344", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  test("handles authorization failure securely", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(new Error("Unauthorized"));

    const result = await getPosTodayOrdersAction();

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});
