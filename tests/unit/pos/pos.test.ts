import { describe, expect, test, vi, beforeEach } from "vitest";
import { createPosOrderAction } from "@/lib/pos/pos-actions";
import prisma from "@/lib/prisma/client";
import { InventoryService } from "@/lib/inventory/service";

// Mock auth
vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue({
    id: "user-staff-1",
    name: "Staff Cashier",
    email: "cashier@vibelock.com",
    role: "STAFF",
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
      $transaction: vi.fn(),
      productVariant: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      category: {
        findMany: vi.fn(),
      },
      product: {
        findMany: vi.fn(),
      },
    },
    Prisma: {
      join: (arr: unknown[]) => arr.join(","),
    },
  };
});

// Mock inventory service
vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    calculateAvailableQuantity: vi.fn(),
  },
}));

describe("POS System - createPosOrderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects when cart items are empty", async () => {
    const result = await createPosOrderAction({
      items: [],
      paymentMethod: "CASH",
      amountPaid: 1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("cart is empty");
  });

  test("rejects when item quantity is invalid (zero or negative)", async () => {
    const result = await createPosOrderAction({
      items: [{ variantId: "var-1", quantity: 0 }],
      paymentMethod: "CASH",
      amountPaid: 1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid item quantity");
  });

  test("rejects when available stock is less than requested quantity", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      productVariant: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "var-1",
            sku: "VL-TEE-BLK-M",
            size: "M",
            color: "Black",
            costPrice: 600,
            sellingPrice: 1200,
            discountPrice: null,
            product: { id: "prod-1", name: "Graphic Tee", status: "PUBLISHED" },
          },
        ]),
      },
    };

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => {
        return await cb(mockTx);
      }
    );

    // Available stock is only 2, but requested is 5
    (InventoryService.calculateAvailableQuantity as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    const result = await createPosOrderAction({
      items: [{ variantId: "var-1", quantity: 5 }],
      paymentMethod: "CASH",
      amountPaid: 6000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Insufficient stock");
    expect(result.error).toContain("Available: 2, requested: 5");
  });

  test("rejects when cash tender is less than order total", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      productVariant: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "var-1",
            sku: "VL-TEE-BLK-M",
            size: "M",
            color: "Black",
            costPrice: 600,
            sellingPrice: 1200,
            discountPrice: null,
            product: { id: "prod-1", name: "Graphic Tee", status: "PUBLISHED" },
          },
        ]),
      },
    };

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => {
        return await cb(mockTx);
      }
    );

    (InventoryService.calculateAvailableQuantity as ReturnType<typeof vi.fn>).mockResolvedValue(10);

    // Total is 1200, but amountPaid is only 1000
    const result = await createPosOrderAction({
      items: [{ variantId: "var-1", quantity: 1 }],
      paymentMethod: "CASH",
      amountPaid: 1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Amount paid (৳1000.00) is less than total amount (৳1200.00)");
  });

  test("creates atomic POS order, payment, and inventory ledger transactions on valid sale", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      productVariant: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "var-1",
            sku: "VL-TEE-BLK-M",
            size: "M",
            color: "Black",
            costPrice: 600,
            sellingPrice: 1500,
            discountPrice: 1200, // Effective unit price = 1200
            product: { id: "prod-1", name: "Graphic Tee", status: "PUBLISHED" },
          },
        ]),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          id: "order-pos-101",
          orderNumber: "VL-POS-TEST-101",
          createdAt: new Date("2026-11-01T15:00:00Z"),
        }),
      },
      payment: {
        create: vi.fn().mockResolvedValue({ id: "pay-1" }),
      },
      inventoryTransaction: {
        create: vi.fn().mockResolvedValue({ id: "inv-tx-1" }),
      },
      orderHistory: {
        create: vi.fn().mockResolvedValue({ id: "hist-1" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" }),
      },
    };

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => {
        return await cb(mockTx);
      }
    );

    (InventoryService.calculateAvailableQuantity as ReturnType<typeof vi.fn>).mockResolvedValue(15);

    const result = await createPosOrderAction({
      items: [{ variantId: "var-1", quantity: 2 }],
      customerName: "Rahim Uddin",
      customerPhone: "01711000000",
      paymentMethod: "CASH",
      amountPaid: 2500, // Total = 2 * 1200 - 100 (discount) = 2300, Tender = 2500, Change = 200
      discount: 100,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Verify receipt numbers
    expect(result.data?.subtotal).toBe(2400);
    expect(result.data?.discount).toBe(100);
    expect(result.data?.total).toBe(2300);
    expect(result.data?.amountPaid).toBe(2500);
    expect(result.data?.changeDue).toBe(200);
    expect(result.data?.customerName).toBe("Rahim Uddin");
    expect(result.data?.customerPhone).toBe("01711000000");

    // Verify Order creation parameters
    expect(mockTx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          salesChannel: "POS",
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "COD",
          subtotal: 2400,
          discount: 100,
          total: 2300,
        }),
      })
    );

    // Verify Payment creation parameters
    expect(mockTx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 2300,
          status: "SUCCESS",
          gateway: "CASH",
        }),
      })
    );

    // Verify Inventory ledger deduction: SALE with negative quantity
    expect(mockTx.inventoryTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          variantId: "var-1",
          type: "SALE",
          quantity: -2,
          salesChannel: "POS",
        }),
      })
    );

    // Verify Order history and audit log
    expect(mockTx.orderHistory.create).toHaveBeenCalled();
    expect(mockTx.auditLog.create).toHaveBeenCalled();
  });
});
