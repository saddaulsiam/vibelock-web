import { requireRole } from "@/lib/auth/authorization";
import { voidPosOrderAction } from "@/lib/pos/pos-void-actions";
import prisma from "@/lib/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue({
    id: "mgr-1",
    name: "Store Manager",
    email: "manager@vibelock.com",
    role: "MANAGER",
  }),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock prisma client
vi.mock("@/lib/prisma/client", () => {
  return {
    default: {
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      productVariant: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    Prisma: {},
  };
});

describe("POS System - voidPosOrderAction (Same-Day Order Void)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects when user is not MANAGER or ADMIN", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new Error("Forbidden: Requires MANAGER or ADMIN role")
    );

    const result = await voidPosOrderAction({ orderId: "ord-pos-1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Forbidden");
  });

  test("rejects when order does not exist", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    const result = await voidPosOrderAction({ orderId: "nonexistent-id" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Order not found");
  });

  test("rejects when order is not a POS sales channel sale", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-web-1",
      orderNumber: "VL-WEB-001",
      salesChannel: "WEBSITE",
      status: "DELIVERED",
      createdAt: new Date(),
      items: [],
      payments: [],
    } as unknown as Awaited<ReturnType<typeof prisma.order.findUnique>>);

    const result = await voidPosOrderAction({ orderId: "ord-web-1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Only in-store POS counter orders can be voided");
  });

  test("rejects when order is already CANCELLED", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-pos-1",
      orderNumber: "VL-POS-001",
      salesChannel: "POS",
      status: "CANCELLED",
      createdAt: new Date(),
      items: [],
      payments: [],
    } as unknown as Awaited<ReturnType<typeof prisma.order.findUnique>>);

    const result = await voidPosOrderAction({ orderId: "ord-pos-1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("already voided/cancelled");
  });

  test("rejects when order has associated returns or exchanges", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-ret-1",
      orderNumber: "VL-POS-RET",
      salesChannel: "POS",
      status: "DELIVERED",
      createdAt: new Date(),
      items: [],
      payments: [],
      returns: [{ id: "ret-req-1" }],
    } as unknown as Awaited<ReturnType<typeof prisma.order.findUnique>>);

    const result = await voidPosOrderAction({ orderId: "ord-ret-1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("associated return/exchange requests");
  });

  test("rejects when order was created more than 24 hours ago", async () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: "ord-old-1",
      orderNumber: "VL-POS-OLD",
      salesChannel: "POS",
      status: "DELIVERED",
      createdAt: twoDaysAgo,
      items: [],
      payments: [],
    } as unknown as Awaited<ReturnType<typeof prisma.order.findUnique>>);

    const result = await voidPosOrderAction({ orderId: "ord-old-1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Same-day void policy");
  });

  test("successfully voids order, restocks inventory, and updates payment to REFUNDED", async () => {
    const mockOrder = {
      id: "ord-pos-100",
      orderNumber: "VL-POS-100",
      salesChannel: "POS",
      status: "DELIVERED",
      total: 3200,
      createdAt: new Date(),
      items: [
        {
          id: "item-1",
          sku: "VL-TEE-BLK-M",
          productName: "Graphic Tee",
          quantity: 2,
        },
      ],
      payments: [
        {
          id: "pay-1",
          amount: 3200,
          status: "SUCCESS",
        },
      ],
    };

    vi.mocked(prisma.order.findUnique).mockResolvedValue(
      mockOrder as unknown as Awaited<ReturnType<typeof prisma.order.findUnique>>
    );

    const mockTx = {
      order: {
        update: vi.fn().mockResolvedValue({}),
      },
      payment: {
        update: vi.fn().mockResolvedValue({}),
      },
      productVariant: {
        findMany: vi.fn().mockResolvedValue([{ id: "var-1", sku: "VL-TEE-BLK-M" }]),
      },
      inventoryTransaction: {
        create: vi.fn().mockResolvedValue({}),
      },
      orderHistory: {
        create: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
      return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
    });

    const result = await voidPosOrderAction({
      orderId: "ord-pos-100",
      reason: "Customer changed mind before leaving store",
    });

    expect(result.success).toBe(true);
    expect(result.data?.orderNumber).toBe("VL-POS-100");

    // Order updated to CANCELLED and REFUNDED
    expect(mockTx.order.update).toHaveBeenCalledWith({
      where: { id: "ord-pos-100" },
      data: {
        status: "CANCELLED",
        paymentStatus: "REFUNDED",
      },
    });

    // Payment updated to REFUNDED
    expect(mockTx.payment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: {
        status: "REFUNDED",
      },
    });

    // InventoryTransaction created with RESTOCK quantity: 2
    expect(mockTx.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: "var-1",
        type: "RESTOCK",
        quantity: 2,
        salesChannel: "POS",
        referenceId: "ord-pos-100",
      }),
    });

    // AuditLog recorded
    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "mgr-1",
        action: "POS_ORDER_VOIDED",
        entityType: "Order",
        entityId: "ord-pos-100",
      }),
    });
  });

  test("refunds redeemed loyalty points and reverses earned points on void", async () => {
    const mockOrderWithLoyalty = {
      id: "ord-pos-loyalty",
      orderNumber: "VL-POS-LOY",
      salesChannel: "POS",
      status: "DELIVERED",
      total: 2000,
      customerPhone: "01712345678",
      createdAt: new Date(),
      loyaltyPointsEarned: 20,
      loyaltyPointsRedeemed: 50,
      items: [
        {
          id: "item-1",
          sku: "VL-TEE-BLK-M",
          productName: "Graphic Tee",
          quantity: 1,
        },
      ],
      payments: [
        {
          id: "pay-split-1",
          amount: 1500,
          status: "SUCCESS",
          gatewayPayload: {
            loyaltyPointsRedeemed: 50,
          },
        },
      ],
    };

    vi.mocked(prisma.order.findUnique).mockResolvedValue(
      mockOrderWithLoyalty as unknown as Awaited<ReturnType<typeof prisma.order.findUnique>>
    );

    const mockAccount = {
      id: "acc-1",
      phone: "01712345678",
      points: 100,
      lifetimePoints: 200,
      lifetimeSpend: 15000,
    };

    const mockTx = {
      order: {
        update: vi.fn().mockResolvedValue({}),
      },
      payment: {
        update: vi.fn().mockResolvedValue({}),
      },
      productVariant: {
        findMany: vi.fn().mockResolvedValue([{ id: "var-1", sku: "VL-TEE-BLK-M" }]),
      },
      inventoryTransaction: {
        create: vi.fn().mockResolvedValue({}),
      },
      loyaltyAccount: {
        findFirst: vi.fn().mockResolvedValue(mockAccount),
        update: vi.fn().mockResolvedValue({}),
      },
      loyaltyTransaction: {
        create: vi.fn().mockResolvedValue({}),
      },
      orderHistory: {
        create: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
      return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
    });

    const result = await voidPosOrderAction({
      orderId: "ord-pos-loyalty",
      reason: "Customer returned immediately",
    });

    expect(result.success).toBe(true);
    expect(result.data?.pointsRefunded).toBe(50);
    expect(result.data?.pointsReversed).toBe(20);

    // Verified REFUNDED transaction for 50 points
    expect(mockTx.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          loyaltyAccountId: "acc-1",
          orderId: "ord-pos-loyalty",
          type: "REFUNDED",
          points: 50,
        }),
      })
    );

    // Verified ADJUSTED transaction reversing 20 points
    expect(mockTx.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          loyaltyAccountId: "acc-1",
          orderId: "ord-pos-loyalty",
          type: "ADJUSTED",
          points: -20,
        }),
      })
    );

    // Final balance updated: 100 + 50 - 20 = 130
    expect(mockTx.loyaltyAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "acc-1" },
        data: expect.objectContaining({
          points: 130,
        }),
      })
    );
  });
});
