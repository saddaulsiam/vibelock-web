/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { expireOrder, cleanupExpiredOrders } from "@/lib/orders/expiration";
import { releaseOrderCoupon } from "@/lib/checkout/coupons";
import { PaymentService } from "@/lib/payment/service";
import { Prisma } from "@prisma/client";
import { GET, POST } from "@/app/api/cron/orders/cleanup/route";
import { NextRequest } from "next/server";

const {
  mockAuth,
  mockPrisma,
  mockCancelOrderInventory,
  lastUpdatedOrders,
} = vi.hoisted(() => {
  const updatedOrders = new Map<string, any>();
  const mockP: any = {
    order: {
      findUnique: vi.fn(async ({ where }: any) => {
        return updatedOrders.get(where?.id) ?? null;
      }),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(async ({ where, data }: any) => {
        const existing = updatedOrders.get(where?.id) || {};
        const updated = {
          ...existing,
          id: where?.id,
          status: data.status ?? existing.status,
          paymentStatus: data.paymentStatus ?? existing.paymentStatus,
          userId: data.userId ?? existing.userId ?? "usr-exp-123",
        };
        updatedOrders.set(where?.id, updated);
        return updated;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (where?.id) {
          const existing = updatedOrders.get(where.id) || {};
          updatedOrders.set(where.id, {
            ...existing,
            id: where.id,
            status: data.status ?? existing.status,
            paymentStatus: data.paymentStatus ?? existing.paymentStatus,
            userId: existing.userId ?? "usr-exp-123",
          });
        }
        return { count: 1 };
      }),
    },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    inventoryReservation: {
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(),
    },
    inventoryTransaction: {
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
    paymentCapture: {
      findMany: vi.fn(async () => []),
    },
    productVariant: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(),
    },
    orderHistory: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    coupon: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(async (strings: any) => {
      const queryText = Array.isArray(strings) ? strings.join(" ") : String(strings || "");
      if (queryText.includes("PaymentCapture") && queryText.includes("INSERT")) {
        return [{ id: "cap-default-1" }];
      }
      return [];
    }),
    $executeRaw: vi.fn(async () => 1),
    $transaction: vi.fn(async (cb: any) => cb(mockP)),
  };

  return {
    mockAuth: vi.fn(),
    mockPrisma: mockP,
    mockCancelOrderInventory: vi.fn(async () => {}),
    lastUpdatedOrders: updatedOrders,
  };
});

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    cancelOrderInventory: mockCancelOrderInventory,
  },
}));

vi.mock("@/lib/checkout/coupons", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    releaseOrderCoupon: vi.fn(async (...args: any[]) => {
      return actual.releaseOrderCoupon(...args);
    }),
  };
});

describe("Phase 12.4.3: Abandoned Order & Coupon Lifecycle", () => {
  const sampleOrderId = "ord-exp-123";
  const sampleOrderNumber = "VL-20261120-EXP01";
  const sampleUserId = "user-alice-123";

  beforeEach(() => {
    vi.clearAllMocks();
    lastUpdatedOrders.clear();
    delete process.env.CRON_SECRET;

    mockPrisma.$queryRaw.mockImplementation(async (queryOrStrings: any) => {
      const queryText = Array.isArray(queryOrStrings)
        ? queryOrStrings.join(" ")
        : queryOrStrings?.text ||
          queryOrStrings?.sql ||
          (Array.isArray(queryOrStrings?.strings)
            ? queryOrStrings.strings.join(" ")
            : String(queryOrStrings || ""));
      if (queryText.includes("PaymentCapture") && queryText.includes("INSERT")) {
        return [{ id: "cap-default-1" }];
      }
      return [];
    });
  });

  describe("1. expireOrder() Core Behavior", () => {
    it("successfully expires an abandoned unpaid online order and releases inventory and coupon", async () => {
      const pastDate = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        createdAt: pastDate,
        inventoryReservations: [
          {
            id: "res-1",
            status: "RESERVED",
            expiresAt: pastDate, // Expired
          },
        ],
        payments: [
          {
            id: "pay-1",
            status: "FAILED",
            createdAt: pastDate,
          },
        ],
      });

      // Audit log lookup in releaseOrderCoupon
      mockPrisma.auditLog.findFirst
        .mockResolvedValueOnce({
          action: "COUPON_REDEEMED",
          metadata: { couponCode: "SAVE20", couponId: "c-1" },
        })
        .mockResolvedValueOnce(null); // not already released

      mockPrisma.$queryRaw.mockImplementation(async (strings: any) => {
        const queryText = Array.isArray(strings) ? strings.join(" ") : String(strings || "");
        if (queryText.includes("Coupon")) {
          return [
            {
              id: "c-1",
              code: "SAVE20",
              usageCount: 5,
              usageLimit: 10,
              isActive: true,
            },
          ];
        }
        return [];
      });

      mockPrisma.coupon.update.mockResolvedValueOnce({
        id: "c-1",
        usageCount: 4,
        isActive: true,
      });

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(sampleOrderId);
      expect(result.orderNumber).toBe(sampleOrderNumber);
      expect(result.releasedCoupon).toBe("SAVE20");

      // Verify order state updated to CANCELLED
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: sampleOrderId },
        data: {
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
        },
      });

      // Verify inventory cancellation called
      expect(mockCancelOrderInventory).toHaveBeenCalledWith(sampleOrderId, expect.anything());

      // Verify OrderHistory created with clear reason
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: sampleOrderId,
            status: "CANCELLED",
            notes: expect.stringContaining("timeout"),
          }),
        })
      );

      // Verify AuditLog created
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: sampleUserId,
            action: "ORDER_EXPIRED",
            entityType: "Order",
            entityId: sampleOrderId,
            metadata: expect.objectContaining({
              from: "PENDING",
              to: "CANCELLED",
              releasedCoupon: "SAVE20",
            }),
          }),
        })
      );
    });

    it("reactivates exhausted coupon when order expires", async () => {
      const pastDate = new Date(Date.now() - 30 * 60 * 1000);

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        createdAt: pastDate,
        inventoryReservations: [],
        payments: [],
      });

      // Coupon was exhausted (isActive: false, usageCount: 10, usageLimit: 10)
      mockPrisma.auditLog.findFirst
        .mockResolvedValueOnce({
          action: "COUPON_REDEEMED",
          metadata: { couponCode: "MAXEDOUT", couponId: "c-max" },
        })
        .mockResolvedValueOnce(null);

      mockPrisma.$queryRaw.mockImplementation(async (strings: any) => {
        const queryText = Array.isArray(strings) ? strings.join(" ") : String(strings || "");
        if (queryText.includes("Coupon")) {
          return [
            {
              id: "c-max",
              code: "MAXEDOUT",
              usageCount: 10,
              usageLimit: 10,
              isActive: false,
            },
          ];
        }
        return [];
      });

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(true);
      expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
        where: { id: "c-max" },
        data: {
          usageCount: 9,
          isActive: true, // Reactivated!
        },
      });
    });

    it("idempotently skips orders that are already cancelled", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        paymentMethod: "ONLINE",
        inventoryReservations: [],
        payments: [],
      });

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(true);
      expect(result.alreadyCancelled).toBe(true);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(mockCancelOrderInventory).not.toHaveBeenCalled();
    });
  });

  describe("2. Immunity for Paid & Active Orders", () => {
    it("refuses to expire orders with paymentStatus === SUCCESS", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        status: "PENDING",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        inventoryReservations: [],
        payments: [],
      });

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("ORDER_ALREADY_PAID");
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(mockCancelOrderInventory).not.toHaveBeenCalled();
    });

    it("refuses to expire orders that have a payment with status SUCCESS", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        inventoryReservations: [],
        payments: [{ id: "p-succ", status: "SUCCESS" }],
      });

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("ORDER_ALREADY_PAID");
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it("refuses to expire orders that are not in PENDING status (e.g. CONFIRMED, PROCESSING)", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        status: "CONFIRMED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        inventoryReservations: [],
        payments: [],
      });

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("ORDER_ALREADY_PAID");
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it("refuses to expire COD orders", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        inventoryReservations: [],
        payments: [],
      });

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("ORDER_NOT_ONLINE");
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe("3. Active Reservation Retention & In-Flight Grace Period", () => {
    it("refuses to expire an order with active unexpired reservations (expiresAt > now)", async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 mins in future

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        inventoryReservations: [
          {
            id: "res-active",
            status: "RESERVED",
            expiresAt: futureDate,
          },
        ],
        payments: [],
      });

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("RESERVATION_NOT_EXPIRED");
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it("refuses to expire an order with a recent in-flight payment attempt (< 15 mins old)", async () => {
      const recentDate = new Date(Date.now() - 3 * 60 * 1000); // 3 mins ago
      const expiredDate = new Date(Date.now() - 1000);

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        inventoryReservations: [
          {
            id: "res-expired",
            status: "RESERVED",
            expiresAt: expiredDate,
          },
        ],
        payments: [
          {
            id: "pay-flight",
            status: "INITIATED",
            createdAt: recentDate,
          },
        ],
      });

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("PAYMENT_IN_FLIGHT");
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it("allows expiration if payment attempt is older than the in-flight grace period (> 15 mins)", async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 1000); // 25 mins ago
      const expiredDate = new Date(Date.now() - 1000);

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        inventoryReservations: [
          {
            id: "res-expired",
            status: "RESERVED",
            expiresAt: expiredDate,
          },
        ],
        payments: [
          {
            id: "pay-stale",
            status: "INITIATED",
            createdAt: oldDate,
          },
        ],
      });

      mockPrisma.auditLog.findFirst.mockResolvedValue(null);

      const result = await expireOrder(sampleOrderId);

      expect(result.success).toBe(true);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: sampleOrderId },
        data: { status: "CANCELLED", paymentStatus: "CANCELLED" },
      });
    });
  });

  describe("4. Defensive Guard in releaseOrderCoupon()", () => {
    it("throws if order repository delegate is missing in transaction client", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => []),
      } as any;

      await expect(releaseOrderCoupon("ord-missing-delegate", mockTx)).rejects.toThrow(
        "Order repository delegate missing in transaction client"
      );
    });

    it("throws if order is not found under lock in database", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => []),
        order: {
          findUnique: vi.fn(async () => null),
        },
      } as any;

      await expect(releaseOrderCoupon("ord-not-found", mockTx)).rejects.toThrow(
        "Order ord-not-found not found during coupon release"
      );
    });

    it("refuses to release a coupon if the order is already paid (paymentStatus: SUCCESS)", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => []),
        order: {
          findUnique: vi.fn(async () => ({
            id: "ord-paid",
            status: "CONFIRMED",
            paymentStatus: "SUCCESS",
            userId: "u-1",
          })),
        },
        auditLog: {
          findFirst: vi.fn(),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      const result = await releaseOrderCoupon("ord-paid", mockTx);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("ORDER_PAID_OR_ACTIVE");
      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    it("refuses to release a coupon if the order is in an active fulfillment state (SHIPPED)", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => []),
        order: {
          findUnique: vi.fn(async () => ({
            id: "ord-shipped",
            status: "SHIPPED",
            paymentStatus: "PENDING", // e.g. COD
            userId: "u-1",
          })),
        },
        auditLog: {
          findFirst: vi.fn(),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      const result = await releaseOrderCoupon("ord-shipped", mockTx);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("ORDER_PAID_OR_ACTIVE");
      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    it("preserves legitimate cancellation flow where the order has already been updated to CANCELLED", async () => {
      const mockTx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // order lock
          .mockResolvedValueOnce([
            { id: "c-paid-cancel", code: "PAID_CANCEL10", usageCount: 2, usageLimit: 10, isActive: true },
          ]), // coupon lock
        order: {
          findUnique: vi.fn(async () => ({
            id: "ord-paid-cancelled",
            status: "CANCELLED", // Already changed to CANCELLED in transaction
            paymentStatus: "SUCCESS",
            userId: "u-1",
          })),
        },
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "PAID_CANCEL10", couponId: "c-paid-cancel" },
            })
            .mockResolvedValueOnce(null),
          create: vi.fn(),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      const result = await releaseOrderCoupon("ord-paid-cancelled", mockTx);

      expect(result.success).toBe(true);
      expect(result.releasedCoupon).toBe("PAID_CANCEL10");
      expect(mockTx.coupon.update).toHaveBeenCalledWith({
        where: { id: "c-paid-cancel" },
        data: { usageCount: 1 },
      });
    });
  });

  describe("5. Concurrency & Repeated Execution Idempotency", () => {
    it("repeated cleanup calls do not double-decrement coupon usage or double-restock inventory", async () => {
      const pastDate = new Date(Date.now() - 30 * 60 * 1000);

      // Run 1: Order expires normally
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        createdAt: pastDate,
        inventoryReservations: [],
        payments: [],
      });
      mockPrisma.auditLog.findFirst
        .mockResolvedValueOnce({
          action: "COUPON_REDEEMED",
          metadata: { couponCode: "DISC10", couponId: "c-10" },
        })
        .mockResolvedValueOnce(null);
      mockPrisma.$queryRaw.mockImplementation(async (strings: any) => {
        const queryText = Array.isArray(strings) ? strings.join(" ") : String(strings || "");
        if (queryText.includes("Coupon")) {
          return [
            { id: "c-10", code: "DISC10", usageCount: 2, usageLimit: 10, isActive: true },
          ];
        }
        return [];
      });

      const run1 = await expireOrder(sampleOrderId);
      expect(run1.success).toBe(true);
      expect(mockPrisma.coupon.update).toHaveBeenCalledTimes(1);

      // Run 2: Same order processed again (now status: CANCELLED)
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        paymentMethod: "ONLINE",
        inventoryReservations: [],
        payments: [],
      });

      const run2 = await expireOrder(sampleOrderId);
      expect(run2.success).toBe(true);
      expect(run2.alreadyCancelled).toBe(true);
      // Coupon update was NOT called again
      expect(mockPrisma.coupon.update).toHaveBeenCalledTimes(1);
    });

    it("concurrent cleanup calls serialize under row lock and second caller skips", async () => {
      // Both workers receive candidate 'ord-exp-123'
      // Worker 1 executes first and marks order CANCELLED
      // Worker 2 executes immediately after and sees CANCELLED
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({
          id: sampleOrderId,
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          inventoryReservations: [],
          payments: [],
        })
        .mockResolvedValueOnce({
          id: sampleOrderId,
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
          paymentMethod: "ONLINE",
          inventoryReservations: [],
          payments: [],
        });

      mockPrisma.auditLog.findFirst.mockResolvedValue(null);

      const [worker1Result, worker2Result] = await Promise.all([
        expireOrder(sampleOrderId),
        expireOrder(sampleOrderId),
      ]);

      expect(worker1Result.success).toBe(true);
      expect(worker2Result.success).toBe(true);
      expect(worker2Result.alreadyCancelled).toBe(true);
    });
  });

  describe("6. cleanupExpiredOrders() Batching & Scanning", () => {
    it("scans candidates and cleans up eligible expired orders in individual transactions", async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([
        { id: "ord-1", orderNumber: "VL-ORD-1" },
        { id: "ord-2", orderNumber: "VL-ORD-2" },
      ]);

      mockPrisma.order.findUnique.mockImplementation(async ({ where }: any) => {
        if (lastUpdatedOrders.has(where?.id)) {
          return lastUpdatedOrders.get(where?.id);
        }
        if (where?.id === "ord-1") {
          return {
            id: "ord-1",
            orderNumber: "VL-ORD-1",
            status: "PENDING",
            paymentStatus: "PENDING",
            paymentMethod: "ONLINE",
            inventoryReservations: [],
            payments: [],
          };
        }
        if (where?.id === "ord-2") {
          return {
            id: "ord-2",
            orderNumber: "VL-ORD-2",
            status: "CONFIRMED",
            paymentStatus: "SUCCESS",
            paymentMethod: "ONLINE",
            inventoryReservations: [],
            payments: [{ status: "SUCCESS" }],
          };
        }
        return null;
      });

      mockPrisma.auditLog.findFirst.mockResolvedValue(null);

      const result = await cleanupExpiredOrders({ batchSize: 10, olderThanMinutes: 15 });

      expect(result.scanned).toBe(2);
      expect(result.expired).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it("isolates errors per candidate so one failure does not halt the batch", async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([
        { id: "ord-err", orderNumber: "VL-ORD-ERR" },
        { id: "ord-ok", orderNumber: "VL-ORD-OK" },
      ]);

      mockPrisma.order.findUnique
        .mockRejectedValueOnce(new Error("Database deadlock on ord-err"))
        .mockResolvedValueOnce({
          id: "ord-ok",
          orderNumber: "VL-ORD-OK",
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          inventoryReservations: [],
          payments: [],
        });

      mockPrisma.auditLog.findFirst.mockResolvedValue(null);

      const result = await cleanupExpiredOrders();

      expect(result.scanned).toBe(2);
      expect(result.expired).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].orderId).toBe("ord-err");
    });
  });

  describe("7. Cron API Route Handler (/api/cron/orders/cleanup)", () => {
    it("rejects unauthorized requests with 401 when no CRON_SECRET or staff session exists", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      mockAuth.mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/cron/orders/cleanup", {
        method: "GET",
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("accepts valid Bearer CRON_SECRET authorization", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      mockPrisma.order.findMany.mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3000/api/cron/orders/cleanup", {
        method: "GET",
        headers: {
          authorization: "Bearer super-secret-cron-token",
        },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.result).toBeDefined();
    });

    it("accepts valid x-cron-secret header authorization", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      mockPrisma.order.findMany.mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3000/api/cron/orders/cleanup", {
        method: "POST",
        headers: {
          "x-cron-secret": "super-secret-cron-token",
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("accepts valid Bearer CRON_SECRET authorization for POST requests", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      mockPrisma.order.findMany.mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3000/api/cron/orders/cleanup", {
        method: "POST",
        headers: {
          authorization: "Bearer super-secret-cron-token",
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.result).toBeDefined();
    });

    it("accepts authorized STAFF user session even if CRON_SECRET is unconfigured", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "staff-1", role: "STAFF" },
      });
      mockPrisma.order.findMany.mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3000/api/cron/orders/cleanup", {
        method: "GET",
      });

      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("8. Fail-Closed Locking & Transaction Integrity", () => {
    it("aborts and throws when Order row-lock fails (never proceeds without lock)", async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(
        new Error("deadlock detected on Order row lock")
      );

      await expect(expireOrder(sampleOrderId)).rejects.toThrow(
        "deadlock detected on Order row lock"
      );

      // Verify no state updates occurred
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(mockCancelOrderInventory).not.toHaveBeenCalled();
    });

    it("aborts and throws when Coupon row-lock fails (no unlocked fallbacks)", async () => {
      const mockTx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // Order lock succeeds
          .mockRejectedValueOnce(new Error("deadlock detected on Coupon row lock")), // Coupon lock fails!
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "PENDING",
            paymentStatus: "PENDING",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "DISC10", couponId: "c-10" },
            })
            .mockResolvedValueOnce(null),
          create: vi.fn(),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      await expect(releaseOrderCoupon(sampleOrderId, mockTx)).rejects.toThrow(
        "deadlock detected on Coupon row lock"
      );

      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    it("throws when coupon release is required but coupon is not found in database", async () => {
      const mockTx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // Order lock
          .mockResolvedValueOnce([]), // Coupon lock returns 0 rows!
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "GHOST_COUPON", couponId: "c-ghost" },
            })
            .mockResolvedValueOnce(null), // not already released in auditLog
          create: vi.fn(),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null), // not already released in orderHistory
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      await expect(releaseOrderCoupon(sampleOrderId, mockTx)).rejects.toThrow(
        'Coupon release required for order ord-exp-123, but expected exactly 1 coupon with id "c-ghost", found 0.'
      );

      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    it("throws and rolls back if locked coupon code does not match redeemed coupon code (metadata mismatch)", async () => {
      const mockTx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // Order lock
          .mockResolvedValueOnce([
            { id: "c-10", code: "OTHER_CODE", usageCount: 5, usageLimit: 10, isActive: true },
          ]), // Coupon lock returns coupon with different code!
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "DISC10", couponId: "c-10" },
            })
            .mockResolvedValueOnce(null),
          create: vi.fn(),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      await expect(releaseOrderCoupon(sampleOrderId, mockTx)).rejects.toThrow(
        'Coupon metadata mismatch for order ord-exp-123: couponId "c-10" has code "OTHER_CODE", expected "DISC10".'
      );

      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    it("throws and rolls back if couponId is absent and query by uppercase code returns 0 rows", async () => {
      const mockTx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // Order lock
          .mockResolvedValueOnce([]), // Code lock returns 0 rows!
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi.fn(async () => null), // No audit log
          create: vi.fn(),
        },
        orderHistory: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              notes: "Coupon applied: CODE_ONLY (discount: 50)",
            })
            .mockResolvedValueOnce(null), // not already released
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      await expect(releaseOrderCoupon(sampleOrderId, mockTx)).rejects.toThrow(
        'Coupon release required for order ord-exp-123, but expected exactly 1 coupon with code "CODE_ONLY", found 0.'
      );

      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    it("locks coupon by ID only when couponId exists and decrements usage count", async () => {
      const mockTx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // Order lock
          .mockResolvedValueOnce([
            { id: "c-by-id", code: "VALID_ID_COUPON", usageCount: 4, usageLimit: 10, isActive: true },
          ]),
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "VALID_ID_COUPON", couponId: "c-by-id" },
            })
            .mockResolvedValueOnce(null),
          create: vi.fn(),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      const result = await releaseOrderCoupon(sampleOrderId, mockTx);

      expect(result.success).toBe(true);
      expect(result.releasedCoupon).toBe("VALID_ID_COUPON");
      expect(mockTx.coupon.update).toHaveBeenCalledWith({
        where: { id: "c-by-id" },
        data: { usageCount: 3 },
      });
    });

    it("locks coupon by normalized code when couponId is absent and decrements usage count", async () => {
      const mockTx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // Order lock
          .mockResolvedValueOnce([
            { id: "c-code-only", code: "CODE_ONLY", usageCount: 3, usageLimit: 10, isActive: true },
          ]),
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi.fn(async () => null), // No audit log
          create: vi.fn(),
        },
        orderHistory: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              notes: "Coupon applied: CODE_ONLY (discount: 50)",
            })
            .mockResolvedValueOnce(null),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      const result = await releaseOrderCoupon(sampleOrderId, mockTx);

      expect(result.success).toBe(true);
      expect(result.releasedCoupon).toBe("CODE_ONLY");
      expect(mockTx.coupon.update).toHaveBeenCalledWith({
        where: { id: "c-code-only" },
        data: { usageCount: 2 },
      });
    });

    it("orderHistory entry with usage released acts as a durable transactional guard against double decrement", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => []),
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          // AuditLog lookup fails or returns null (simulating best-effort audit gap)
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "GUARDED10", couponId: "c-10" },
            })
            .mockResolvedValueOnce(null), // AuditLog says not released
          create: vi.fn(),
        },
        orderHistory: {
          // Durable relational guard: OrderHistory contains 'usage released'
          findFirst: vi.fn(async () => ({
            notes: 'Coupon "GUARDED10" usage released (count: 5 -> 4).',
          })),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      const result = await releaseOrderCoupon(sampleOrderId, mockTx);

      expect(result.success).toBe(true);
      expect(result.alreadyReleased).toBe(true);
      expect(result.releasedCoupon).toBe("GUARDED10");
      // Coupon was NOT decremented again
      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    it("throws and causes transaction rollback when tx.auditLog.create fails during coupon release", async () => {
      const mockTx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // Order lock
          .mockResolvedValueOnce([
            { id: "c-fail-audit", code: "FAIL_AUDIT", usageCount: 5, usageLimit: 10, isActive: true },
          ]),
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "FAIL_AUDIT", couponId: "c-fail-audit" },
            })
            .mockResolvedValueOnce(null),
          create: vi.fn().mockRejectedValue(new Error("Database write failure on AuditLog")),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      await expect(releaseOrderCoupon(sampleOrderId, mockTx)).rejects.toThrow(
        "Database write failure on AuditLog"
      );
    });

    it("throws and causes transaction rollback when tx.orderHistory.create fails during coupon release", async () => {
      const mockTx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // Order lock
          .mockResolvedValueOnce([
            { id: "c-fail-hist", code: "FAIL_HIST", usageCount: 5, usageLimit: 10, isActive: true },
          ]),
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "FAIL_HIST", couponId: "c-fail-hist" },
            })
            .mockResolvedValueOnce(null),
          create: vi.fn(),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn().mockRejectedValue(new Error("Database write failure on OrderHistory")),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      await expect(releaseOrderCoupon(sampleOrderId, mockTx)).rejects.toThrow(
        "Database write failure on OrderHistory"
      );
    });

    it("throws when tx.auditLog delegate is missing and does not silently treat as no coupon", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => []),
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        // auditLog delegate missing entirely
        orderHistory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(),
        },
        coupon: {
          update: vi.fn(),
        },
      } as any;

      await expect(releaseOrderCoupon(sampleOrderId, mockTx)).rejects.toThrow();
      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    it("throws when tx.orderHistory delegate is missing and does not silently treat as unreleased", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => []),
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "SOME_CODE", couponId: "c-some" },
            })
            .mockResolvedValueOnce(null), // AuditLog says not released
          create: vi.fn(),
        },
        // orderHistory delegate missing entirely
        coupon: {
          update: vi.fn(),
        },
      } as any;

      await expect(releaseOrderCoupon(sampleOrderId, mockTx)).rejects.toThrow();
      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    it("repeated successful release does not decrement usageCount twice", async () => {
      let currentUsage = 5;
      const recordedAuditLogs: any[] = [];
      const recordedHistory: any[] = [];

      const createTx = () => ({
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([]) // Order lock
          .mockResolvedValueOnce([
            { id: "c-repeat", code: "REPEAT10", usageCount: currentUsage, usageLimit: 10, isActive: true },
          ]),
        order: {
          findUnique: vi.fn(async () => ({
            id: sampleOrderId,
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: sampleUserId,
          })),
        },
        auditLog: {
          findFirst: vi.fn(async ({ where }: any) => {
            if (where.action === "COUPON_REDEEMED") {
              return { action: "COUPON_REDEEMED", metadata: { couponCode: "REPEAT10", couponId: "c-repeat" } };
            }
            if (where.action === "COUPON_RELEASED") {
              return recordedAuditLogs.find((l) => l.action === "COUPON_RELEASED") || null;
            }
            return null;
          }),
          create: vi.fn(async ({ data }: any) => {
            recordedAuditLogs.push(data);
          }),
        },
        orderHistory: {
          findFirst: vi.fn(async () => {
            return recordedHistory[0] || null;
          }),
          create: vi.fn(async ({ data }: any) => {
            recordedHistory.push(data);
          }),
        },
        coupon: {
          update: vi.fn(async ({ data }: any) => {
            currentUsage = data.usageCount;
          }),
        },
      } as any);

      // Run 1: First release succeeds and decrements count
      const res1 = await releaseOrderCoupon(sampleOrderId, createTx());
      expect(res1.success).toBe(true);
      expect(res1.releasedCoupon).toBe("REPEAT10");
      expect(res1.alreadyReleased).toBeUndefined();
      expect(currentUsage).toBe(4);
      expect(recordedAuditLogs).toHaveLength(1);
      expect(recordedHistory).toHaveLength(1);

      // Run 2: Second release for the same order detects existing release and does NOT decrement again
      const res2 = await releaseOrderCoupon(sampleOrderId, createTx());
      expect(res2.success).toBe(true);
      expect(res2.releasedCoupon).toBe("REPEAT10");
      expect(res2.alreadyReleased).toBe(true);
      expect(currentUsage).toBe(4); // Remains 4, never decremented twice!
    });
  });

  describe("9. Payment Callback vs Expiration Concurrency & Lock Ordering", () => {
    it("Lock Ordering A: Expiration wins lock, Payment verification arrives second and enters LATE_PAYMENT_ON_CANCELLED_ORDER safely", async () => {
      // Step 1: Expiration runs and cancels order
      const pastDate = new Date(Date.now() - 30 * 60 * 1000);
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        createdAt: pastDate,
        inventoryReservations: [],
        payments: [
          {
            id: "pay-late-1",
            status: "INITIATED",
            createdAt: pastDate,
          },
        ],
      });
      mockPrisma.auditLog.findFirst.mockResolvedValue(null);

      const expResult = await expireOrder(sampleOrderId);
      expect(expResult.success).toBe(true);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: sampleOrderId },
        data: { status: "CANCELLED", paymentStatus: "CANCELLED" },
      });
      expect(mockCancelOrderInventory).toHaveBeenCalledWith(sampleOrderId, expect.anything());

      // Step 2: Payment callback arrives AFTER expiration committed
      // Invoke real PaymentService.verifyCallback()
      const paymentRecord = {
        id: "pay-late-1",
        orderId: sampleOrderId,
        amount: new Prisma.Decimal("1000.00"),
        currency: "BDT",
        status: "INITIATED",
        gateway: "SSLCOMMERZ",
        merchantReferenceId: "SSLC-REF-LATE-1",
        gatewayPayload: {},
      };
      mockPrisma.payment.findUnique.mockResolvedValue(paymentRecord);

      const cancelledOrderInDb = {
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "CANCELLED", // Expiration committed first!
        paymentStatus: "CANCELLED",
        items: [
          {
            id: "item-late-1",
            sku: "SKU-VIBE-01",
            quantity: 1,
            unitPrice: new Prisma.Decimal("1000.00"),
          },
        ],
      };
      mockPrisma.order.findUnique.mockResolvedValue(cancelledOrderInDb);

      const paymentService = new PaymentService();
      const mockProvider = {
        verifyPayment: vi.fn().mockResolvedValue({
          success: true,
          status: "SUCCESS",
          isUnverified: false,
          verifiedMerchantReferenceId: "SSLC-REF-LATE-1",
          providerTransactionId: "BANK-TRX-LATE-999",
          verifiedAmount: 1000,
          verifiedCurrency: "BDT",
          rawPayload: {
            val_id: "VAL-LATE-999",
            bank_tran_id: "BANK-TRX-LATE-999",
            status: "VALID",
            amount: "1000.00",
            currency: "BDT",
          },
        }),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider);

      mockPrisma.order.update.mockClear();
      mockPrisma.orderHistory.create.mockClear();
      mockPrisma.auditLog.create.mockClear();
      mockPrisma.inventoryTransaction.createMany.mockClear();

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-REF-LATE-1",
        val_id: "VAL-LATE-999",
        amount: "1000.00",
      });

      // Assert real PaymentService database calls:
      // 1. Order paymentStatus updated to SUCCESS
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleOrderId },
          data: { paymentStatus: "SUCCESS" },
        })
      );

      // 2. OrderHistory recorded LATE_PAYMENT_ON_CANCELLED_ORDER with notes
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: sampleOrderId,
            status: "CANCELLED",
            notes: expect.stringContaining("[LATE_PAYMENT_ON_CANCELLED_ORDER]"),
          }),
        })
      );

      // 3. AuditLog recorded LATE_PAYMENT_ON_CANCELLED_ORDER
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "LATE_PAYMENT_ON_CANCELLED_ORDER",
            entityId: sampleOrderId,
          }),
        })
      );

      // 4. Inventory was NOT deducted (no SALE inventoryTransaction created)
      expect(mockPrisma.inventoryTransaction.createMany).not.toHaveBeenCalled();
    });

    it("Lock Ordering B: Payment verification wins lock, Expiration arrives second and safely aborts without mutating order or releasing stock", async () => {
      // Step 1: Payment callback arrives and commits first
      // Invoke real PaymentService.verifyCallback()
      const paymentRecord = {
        id: "pay-early-1",
        orderId: sampleOrderId,
        amount: new Prisma.Decimal("1000.00"),
        currency: "BDT",
        status: "INITIATED",
        gateway: "SSLCOMMERZ",
        merchantReferenceId: "SSLC-REF-EARLY-1",
        gatewayPayload: {},
      };
      mockPrisma.payment.findUnique.mockResolvedValue(paymentRecord);

      const pendingOrderInDb = {
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        inventoryReservations: [{ id: "res-early-1", status: "RESERVED" }],
        payments: [paymentRecord],
        items: [
          {
            id: "item-early-1",
            sku: "SKU-VIBE-01",
            quantity: 1,
            unitPrice: new Prisma.Decimal("1000.00"),
          },
        ],
      };
      mockPrisma.order.findUnique.mockResolvedValue(pendingOrderInDb);

      const paymentService = new PaymentService();
      const mockProvider = {
        verifyPayment: vi.fn().mockResolvedValue({
          success: true,
          status: "SUCCESS",
          isUnverified: false,
          verifiedMerchantReferenceId: "SSLC-REF-EARLY-1",
          providerTransactionId: "BANK-TRX-EARLY-888",
          verifiedAmount: 1000,
          verifiedCurrency: "BDT",
          rawPayload: {
            val_id: "VAL-EARLY-888",
            bank_tran_id: "BANK-TRX-EARLY-888",
            status: "VALID",
            amount: "1000.00",
            currency: "BDT",
            risk_level: "0",
          },
        }),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-REF-EARLY-1",
        val_id: "VAL-EARLY-888",
        amount: "1000.00",
      });

      // Verify payment committed paymentStatus: SUCCESS
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: sampleOrderId }),
          data: expect.objectContaining({ paymentStatus: "SUCCESS" }),
        })
      );

      // Step 2: Expiration job arrives second
      // In DB, order now has paymentStatus = SUCCESS
      mockPrisma.order.findUnique.mockResolvedValue({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "CONFIRMED",
        paymentStatus: "SUCCESS", // Payment verification committed first!
        paymentMethod: "ONLINE",
        inventoryReservations: [{ id: "res-early-1", status: "COMMITTED" }],
        payments: [{ id: "pay-early-1", status: "SUCCESS" }],
      });

      mockPrisma.order.update.mockClear();
      mockCancelOrderInventory.mockClear();

      const expResult = await expireOrder(sampleOrderId);

      // Expiration safely aborted!
      expect(expResult.success).toBe(false);
      expect(expResult.reason).toBe("ORDER_ALREADY_PAID");
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(mockCancelOrderInventory).not.toHaveBeenCalled();
    });
  });
});
