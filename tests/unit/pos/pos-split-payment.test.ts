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

describe("POS System - Split Payment Settlement (createPosOrderAction)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("processes split payments across Cash and bKash with multi-payment creation", async () => {
    const mockVariants = [
      {
        id: "var-1",
        sku: "VL-TEE-BLK-M",
        size: "M",
        color: "Black",
        sellingPrice: 1000,
        discountPrice: null,
        costPrice: 400,
        product: { id: "prod-1", name: "Graphic Tee", status: "PUBLISHED" },
      },
      {
        id: "var-2",
        sku: "VL-CAP-BLK-OS",
        size: "OS",
        color: "Black",
        sellingPrice: 800,
        discountPrice: null,
        costPrice: 300,
        product: { id: "prod-2", name: "Snapback Cap", status: "PUBLISHED" },
      },
    ];

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      productVariant: {
        findMany: vi.fn().mockResolvedValue(mockVariants),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          id: "ord-split-1",
          orderNumber: "VL-POS-SPLIT-01",
          createdAt: new Date("2026-11-01T15:00:00Z"),
          total: 1800,
          subtotal: 1800,
          discount: 0,
        }),
      },
      payment: {
        create: vi.fn().mockResolvedValue({ id: "pay-1" }),
      },
      inventoryTransaction: {
        create: vi.fn().mockResolvedValue({ id: "inv-1" }),
      },
      orderHistory: {
        create: vi.fn().mockResolvedValue({ id: "hist-1" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud-1" }),
      },
    };

    vi.mocked(InventoryService.calculateAvailableQuantity).mockResolvedValue(10);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
      return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
    });

    const result = await createPosOrderAction({
      items: [
        { variantId: "var-1", quantity: 1 },
        { variantId: "var-2", quantity: 1 },
      ],
      paymentMethod: "SPLIT",
      amountPaid: 1800,
      customerName: "Siam Hossain",
      customerPhone: "01711223344",
      splitPayments: [
        { method: "CASH", amount: 1000, tenderAmount: 1000 },
        { method: "BKASH", amount: 800, reference: "TRX998877" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const data = result.data!;
    expect(data.total).toBe(1800);
    expect(data.paymentMethod).toBe("SPLIT");
    expect(data.splits).toHaveLength(2);

    expect(data.splits![0].method).toBe("CASH");
    expect(data.splits![0].amount).toBe(1000);

    expect(data.splits![1].method).toBe("BKASH");
    expect(data.splits![1].amount).toBe(800);
    expect(data.splits![1].reference).toBe("TRX998877");

    // Verify 2 payment records were created in db transaction
    expect(mockTx.payment.create).toHaveBeenCalledTimes(2);

    // Verify first payment record (Cash)
    expect(mockTx.payment.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          gateway: "CASH",
          amount: 1000,
        }),
      })
    );

    // Verify second payment record (bKash)
    expect(mockTx.payment.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          gateway: "BKASH",
          amount: 800,
        }),
      })
    );

    // Order level payment method should be COD because cash tender is included
    expect(mockTx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentMethod: "COD",
        }),
      })
    );
  });

  test("calculates cash change correctly in split tender when tender amount exceeds cash portion", async () => {
    const mockVariants = [
      {
        id: "var-1",
        sku: "VL-TEE-BLK-M",
        size: "M",
        color: "Black",
        sellingPrice: 1500,
        discountPrice: null,
        costPrice: 500,
        product: { id: "prod-1", name: "Graphic Tee", status: "PUBLISHED" },
      },
    ];

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      productVariant: {
        findMany: vi.fn().mockResolvedValue(mockVariants),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          id: "ord-split-2",
          orderNumber: "VL-POS-SPLIT-02",
          createdAt: new Date(),
          total: 1500,
          subtotal: 1500,
          discount: 0,
        }),
      },
      payment: {
        create: vi.fn().mockResolvedValue({ id: "pay-2" }),
      },
      inventoryTransaction: {
        create: vi.fn().mockResolvedValue({ id: "inv-2" }),
      },
      orderHistory: {
        create: vi.fn().mockResolvedValue({ id: "hist-2" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud-2" }),
      },
    };

    vi.mocked(InventoryService.calculateAvailableQuantity).mockResolvedValue(10);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
      return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
    });

    // Customer owes ৳1500: pays ৳1000 card, and gives ৳1000 cash for the ৳500 cash portion -> change ৳500
    const result = await createPosOrderAction({
      items: [{ variantId: "var-1", quantity: 1 }],
      paymentMethod: "SPLIT",
      amountPaid: 2000,
      splitPayments: [
        { method: "CARD", amount: 1000, reference: "AUTH5544" },
        { method: "CASH", amount: 500, tenderAmount: 1000 },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const data = result.data!;
    expect(data.changeDue).toBe(500); // 1000 - 500
    expect(data.amountPaid).toBe(2000); // 1000 card + 1000 cash tender
  });

  test("rejects when total split allocation is less than order total", async () => {
    const mockVariants = [
      {
        id: "var-1",
        sku: "VL-TEE-BLK-M",
        size: "M",
        color: "Black",
        sellingPrice: 1500,
        discountPrice: null,
        costPrice: 500,
        product: { id: "prod-1", name: "Graphic Tee", status: "PUBLISHED" },
      },
    ];

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      productVariant: {
        findMany: vi.fn().mockResolvedValue(mockVariants),
      },
    };

    vi.mocked(InventoryService.calculateAvailableQuantity).mockResolvedValue(10);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
      return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
    });

    // Order is ৳1500, but only ৳1000 allocated in split
    const result = await createPosOrderAction({
      items: [{ variantId: "var-1", quantity: 1 }],
      paymentMethod: "SPLIT",
      amountPaid: 1000,
      splitPayments: [
        { method: "CASH", amount: 500 },
        { method: "BKASH", amount: 500 },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "Total allocated across split payment methods (৳1000.00) is less than total amount (৳1500.00)"
    );
  });
});
