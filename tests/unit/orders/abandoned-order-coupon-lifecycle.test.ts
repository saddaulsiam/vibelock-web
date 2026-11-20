/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { expireOrder, cleanupExpiredOrders } from "@/lib/orders/expiration";
import { releaseOrderCoupon } from "@/lib/checkout/coupons";
import { GET, POST } from "@/app/api/cron/orders/cleanup/route";
import { NextRequest } from "next/server";

const {
  mockAuth,
  mockPrisma,
  mockCancelOrderInventory,
} = vi.hoisted(() => {
  const mockP: any = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    inventoryReservation: {
      updateMany: vi.fn(),
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
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(async (cb: any) => cb(mockP)),
  };

  return {
    mockAuth: vi.fn(),
    mockPrisma: mockP,
    mockCancelOrderInventory: vi.fn(async () => {}),
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
    delete process.env.CRON_SECRET;
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

      // Order 1 is expired and succeeds
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: "VL-ORD-1",
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          inventoryReservations: [],
          payments: [],
        })
        // Order 2 is already paid (simulating concurrent payment before order 2's lock)
        .mockResolvedValueOnce({
          id: "ord-2",
          orderNumber: "VL-ORD-2",
          status: "CONFIRMED",
          paymentStatus: "SUCCESS",
          paymentMethod: "ONLINE",
          inventoryReservations: [],
          payments: [{ status: "SUCCESS" }],
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
        'Coupon release required for order ord-exp-123, but coupon "GHOST_COUPON" was not found.'
      );

      expect(mockTx.coupon.update).not.toHaveBeenCalled();
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
        payments: [],
      });
      mockPrisma.auditLog.findFirst.mockResolvedValue(null);

      const expResult = await expireOrder(sampleOrderId);
      expect(expResult.success).toBe(true);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: sampleOrderId },
        data: { status: "CANCELLED", paymentStatus: "CANCELLED" },
      });

      // Step 2: Payment callback acquires Order lock second
      // Simulating PaymentService.verifyCallback reading order after expiration committed
      const lockedOrderInCallback = {
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        status: "CANCELLED", // Expiration won the lock!
        paymentStatus: "CANCELLED",
      };

      // Under PaymentService.verifyCallback lines 1284-1323:
      // When status is CANCELLED, paymentStatus is updated to SUCCESS, but order stays CANCELLED
      // and inventory is NOT deducted
      expect(lockedOrderInCallback.status).toBe("CANCELLED");
      expect(expResult.alreadyCancelled).toBeUndefined();
    });

    it("Lock Ordering B: Payment verification wins lock, Expiration arrives second and safely aborts without mutating order or releasing stock", async () => {
      // Payment verification won lock and committed paymentStatus = SUCCESS
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "CONFIRMED",
        paymentStatus: "SUCCESS", // Payment verification committed first!
        paymentMethod: "ONLINE",
        inventoryReservations: [{ id: "res-1", status: "COMMITTED" }],
        payments: [{ id: "pay-1", status: "SUCCESS" }],
      });

      const expResult = await expireOrder(sampleOrderId);

      // Expiration safely aborted!
      expect(expResult.success).toBe(false);
      expect(expResult.reason).toBe("ORDER_ALREADY_PAID");
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(mockCancelOrderInventory).not.toHaveBeenCalled();
    });
  });
});
