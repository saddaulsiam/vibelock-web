import { InventoryService } from "@/lib/inventory/service";
import {
  lookupPosOrderForReturnAction,
  processPosReturnAction,
} from "@/lib/pos/pos-returns-actions";
import prisma from "@/lib/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue({
    id: "cashier-101",
    name: "Siam Ahmed",
    email: "siam@vibelock.com",
    role: "STAFF",
  }),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock ReturnService
vi.mock("@/lib/returns/service", () => {
  return {
    ReturnService: class {
      getReturnableQuantities = vi.fn().mockResolvedValue({ "item-1": 2 });
      processReturnRestock = vi.fn().mockResolvedValue(undefined);
    },
  };
});

// Mock InventoryService
vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    calculateAvailableQuantity: vi.fn(),
  },
}));

// Mock shift actions
vi.mock("@/lib/pos/pos-shift-actions", () => ({
  getCurrentShiftAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      shiftId: "shift-123",
      isOpen: true,
      expectedCash: 5000,
    },
  }),
}));

// Mock Prisma
vi.mock("@/lib/prisma/client", () => {
  return {
    default: {
      $transaction: vi.fn(),
      order: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
    Prisma: {
      join: (arr: unknown[]) => arr.join(","),
    },
  };
});

describe("POS In-Store Returns & Exchanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("lookupPosOrderForReturnAction", () => {
    test("rejects empty invoice number input", async () => {
      const res = await lookupPosOrderForReturnAction("");
      expect(res.success).toBe(false);
      expect(res.error).toContain("valid invoice");
    });

    test("rejects non-existent order", async () => {
      (prisma.order.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const res = await lookupPosOrderForReturnAction("VL-POS-NONEXISTENT");
      expect(res.success).toBe(false);
      expect(res.error).toContain("No order found");
    });

    test("rejects order when not marked as DELIVERED", async () => {
      (prisma.order.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "ord-pending",
        orderNumber: "VL-POS-PENDING",
        status: "PROCESSING",
        items: [],
      });

      const res = await lookupPosOrderForReturnAction("VL-POS-PENDING");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Only DELIVERED orders can be returned");
    });

    test("successfully loads order with returnable quantities and 7-day policy validity", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      (prisma.order.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "ord-valid",
        orderNumber: "VL-POS-1001",
        status: "DELIVERED",
        salesChannel: "POS",
        customerName: "Rahim",
        customerPhone: "01712345678",
        total: 2400,
        createdAt: twoDaysAgo,
        items: [
          {
            id: "item-1",
            productName: "Oversized Tee",
            sku: "VL-TEE-BLK-M",
            size: "M",
            color: "Black",
            unitPrice: 1200,
            quantity: 2,
          },
        ],
      });

      const res = await lookupPosOrderForReturnAction("VL-POS-1001");
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();

      const data = res.data!;
      expect(data.orderNumber).toBe("VL-POS-1001");
      expect(data.isReturnablePeriodValid).toBe(true);
      expect(data.daysElapsed).toBe(2);
      expect(data.items[0].returnableQuantity).toBe(2);
    });
  });

  describe("processPosReturnAction", () => {
    test("rejects when no items selected", async () => {
      const res = await processPosReturnAction({
        orderId: "ord-1",
        returnedItems: [],
        resolution: "REFUND_CASH",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("select at least one item");
    });

    test("successfully processes cash refund and restocks resellable item", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        order: {
          findUnique: vi.fn().mockResolvedValue({
            id: "ord-1",
            orderNumber: "VL-POS-1001",
            customerName: "Rahim",
            customerPhone: "01712345678",
            items: [
              {
                id: "item-1",
                productName: "Oversized Tee",
                sku: "VL-TEE-BLK-M",
                size: "M",
                color: "Black",
                unitPrice: 1200,
                quantity: 2,
              },
            ],
          }),
        },
        returnRequest: {
          create: vi.fn().mockResolvedValue({
            id: "ret-req-1",
            items: [{ id: "ret-item-1", orderItemId: "item-1" }],
          }),
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

      const res = await processPosReturnAction({
        orderId: "ord-1",
        returnedItems: [
          {
            orderItemId: "item-1",
            quantity: 1,
            reason: "SIZE_MISMATCH",
            condition: "RESELLABLE",
          },
        ],
        resolution: "REFUND_CASH",
        notes: "Customer wants cash refund",
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();

      const receipt = res.data!;
      expect(receipt.totalReturnValue).toBe(1200);
      expect(receipt.netDifference).toBe(-1200);
      expect(receipt.netAction).toBe("REFUND_TO_CUSTOMER");
      expect(receipt.returnMemoNumber).toContain("VL-RET-");

      // Verify ReturnRequest created as COMPLETED
      expect(mockTx.returnRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: "ord-1",
            status: "COMPLETED",
          }),
        })
      );
    });

    test("successfully processes in-store product exchange with price difference", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        order: {
          findUnique: vi.fn().mockResolvedValue({
            id: "ord-1",
            orderNumber: "VL-POS-1001",
            customerName: "Rahim",
            customerPhone: "01712345678",
            items: [
              {
                id: "item-1",
                productName: "Oversized Tee",
                sku: "VL-TEE-BLK-M",
                size: "M",
                color: "Black",
                unitPrice: 1200,
                quantity: 1,
              },
            ],
          }),
        },
        returnRequest: {
          create: vi.fn().mockResolvedValue({
            id: "ret-req-2",
            items: [{ id: "ret-item-2", orderItemId: "item-1" }],
          }),
        },
        productVariant: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "var-hoodie",
              sku: "VL-HOOD-BLK-L",
              size: "L",
              color: "Black",
              sellingPrice: 2200,
              discountPrice: null,
              product: { name: "Fleece Hoodie", status: "PUBLISHED" },
            },
          ]),
        },
        payment: {
          create: vi.fn().mockResolvedValue({ id: "pay-exch-1" }),
        },
        inventoryTransaction: {
          create: vi.fn().mockResolvedValue({ id: "inv-tx-rep" }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit-2" }),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return await cb(mockTx);
        }
      );

      // Replacement Hoodie (price 2200, stock 5)
      (InventoryService.calculateAvailableQuantity as ReturnType<typeof vi.fn>).mockResolvedValue(
        5
      );

      const res = await processPosReturnAction({
        orderId: "ord-1",
        returnedItems: [
          {
            orderItemId: "item-1",
            quantity: 1,
            reason: "SIZE_MISMATCH",
            condition: "RESELLABLE",
          },
        ],
        resolution: "EXCHANGE",
        exchangeItems: [
          {
            variantId: "var-hoodie",
            productName: "Fleece Hoodie",
            sku: "VL-HOOD-BLK-L",
            size: "L",
            color: "Black",
            unitPrice: 2200,
            quantity: 1,
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();

      const receipt = res.data!;
      expect(receipt.totalReturnValue).toBe(1200);
      expect(receipt.totalExchangeValue).toBe(2200);
      expect(receipt.netDifference).toBe(1000); // 2200 - 1200 = 1000
      expect(receipt.netAction).toBe("CHARGE_CUSTOMER");

      // Verify replacement stock deducted
      expect(mockTx.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: "var-hoodie",
            type: "SALE",
            quantity: -1,
            salesChannel: "POS",
          }),
        })
      );

      // Verify exchange charge payment recorded
      expect(mockTx.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: "ord-1",
            amount: 1000,
            status: "SUCCESS",
            gateway: "CASH",
          }),
        })
      );
    });

    test("pro-rates refund value on discounted orders and ignores tampered exchange price", async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        order: {
          findUnique: vi.fn().mockResolvedValue({
            id: "ord-disc",
            orderNumber: "VL-POS-DISC",
            createdAt: new Date(),
            subtotal: 1000,
            total: 700, // 300 order-level discount
            customerName: "Rahim",
            customerPhone: "01712345678",
            items: [
              {
                id: "item-1",
                productName: "Oversized Tee",
                sku: "VL-TEE-BLK-M",
                size: "M",
                color: "Black",
                unitPrice: 1000,
                lineTotal: 1000,
                quantity: 1,
              },
            ],
          }),
        },
        returnRequest: {
          create: vi.fn().mockResolvedValue({
            id: "ret-req-3",
            items: [{ id: "ret-item-3", orderItemId: "item-1" }],
          }),
        },
        productVariant: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "var-jacket",
              sku: "VL-JKT-BLK-L",
              size: "L",
              color: "Black",
              sellingPrice: 5000,
              discountPrice: null,
              product: { name: "Winter Jacket", status: "PUBLISHED" },
            },
          ]),
        },
        payment: {
          create: vi.fn().mockResolvedValue({ id: "pay-exch-2" }),
        },
        inventoryTransaction: {
          create: vi.fn().mockResolvedValue({ id: "inv-tx-rep" }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit-3" }),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return await cb(mockTx);
        }
      );

      (InventoryService.calculateAvailableQuantity as ReturnType<typeof vi.fn>).mockResolvedValue(
        3
      );

      const res = await processPosReturnAction({
        orderId: "ord-disc",
        returnedItems: [
          {
            orderItemId: "item-1",
            quantity: 1,
            reason: "SIZE_MISMATCH",
            condition: "RESELLABLE",
          },
        ],
        resolution: "EXCHANGE",
        exchangePaymentMethod: "CARD",
        exchangeItems: [
          {
            variantId: "var-jacket",
            productName: "Winter Jacket",
            sku: "VL-JKT-BLK-L",
            size: "L",
            color: "Black",
            unitPrice: 500, // Tampered client price; DB is 5000
            quantity: 1,
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data!.totalReturnValue).toBe(700); // Pro-rated, not 1000
      expect(res.data!.totalExchangeValue).toBe(5000); // DB-authoritative, not 500
      expect(res.data!.netDifference).toBe(4300);
      expect(mockTx.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 4300,
            gateway: "CARD",
          }),
        })
      );
    });

    test("rejects return past 7-day window for STAFF", async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        order: {
          findUnique: vi.fn().mockResolvedValue({
            id: "ord-old",
            orderNumber: "VL-POS-OLD",
            createdAt: tenDaysAgo,
            subtotal: 1000,
            total: 1000,
            items: [],
          }),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return await cb(mockTx);
        }
      );

      const res = await processPosReturnAction({
        orderId: "ord-old",
        returnedItems: [
          {
            orderItemId: "item-1",
            quantity: 1,
            reason: "OTHER",
            condition: "RESELLABLE",
          },
        ],
        resolution: "REFUND_CASH",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Return window (7 days) has expired");
    });
  });
});
