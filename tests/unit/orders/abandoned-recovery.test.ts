/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockEnv,
  mockAuth,
  mockPrisma,
  mockSendSmsNotification,
  mockSendAbandonedCartEmail,
  mockLogSecurityAlert,
} = vi.hoisted(() => {
  const mockP: any = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    orderHistory: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    cart: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  return {
    mockEnv: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
      AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
      EMAIL_FROM: "VibeLock <noreply@vibelock.bd>",
      RESEND_API_KEY: "re_mock_test_key",
    },
    mockAuth: vi.fn(),
    mockPrisma: mockP,
    mockSendSmsNotification: vi.fn().mockResolvedValue(true),
    mockSendAbandonedCartEmail: vi.fn().mockResolvedValue(true),
    mockLogSecurityAlert: vi.fn(),
  };
});

vi.mock("@/lib/config/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/config/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: "https://vibelock.bd",
  },
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/sms/client", () => ({
  sendSmsNotification: mockSendSmsNotification,
}));

vi.mock("@/lib/email/abandoned-cart-email", () => ({
  sendAbandonedCartEmail: mockSendAbandonedCartEmail,
}));

vi.mock("@/lib/monitoring/security-logger", () => ({
  logSecurityAlert: mockLogSecurityAlert,
}));

import {
  processAbandonedReminders,
  sendManualAbandonedOrderReminder,
} from "@/lib/orders/abandoned-recovery";
import { GET, POST } from "@/app/api/cron/abandoned-reminders/route";
import { NextRequest } from "next/server";

describe("Automated Abandoned Cart & Checkout Recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  describe("processAbandonedReminders - Orders", () => {
    it("identifies candidate unpaid online orders and sends SMS + Email recovery reminders", async () => {
      const mockOrder = {
        id: "ord-test-01",
        orderNumber: "VL-20261122-TEST01",
        customerName: "Siam Ahmed",
        customerPhone: "01712345678",
        customerEmail: "siam@example.com",
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING",
        status: "PENDING",
        subtotal: 2400,
        total: 2520,
        createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
        items: [
          {
            productName: "Heavyweight Graphic Tee",
            size: "L",
            color: "Pitch Black",
            quantity: 2,
            unitPrice: 1200,
            lineTotal: 2400,
          },
        ],
      };

      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.cart.findMany.mockResolvedValue([]);
      mockPrisma.orderHistory.create.mockResolvedValue({ id: "hist-1" });

      const result = await processAbandonedReminders({
        olderThanMinutes: 30,
        dryRun: false,
      });

      expect(result.scannedOrders).toBe(1);
      expect(result.remindedOrders).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify SMS dispatch with sanitized phone (88017...)
      expect(mockSendSmsNotification).toHaveBeenCalledTimes(1);
      expect(mockSendSmsNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "8801712345678",
          purpose: "abandoned_cart_recovery",
          message: expect.stringContaining("VL-20261122-TEST01"),
        })
      );
      expect(mockSendSmsNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Siam"),
        })
      );

      // Verify Email dispatch
      expect(mockSendAbandonedCartEmail).toHaveBeenCalledTimes(1);
      expect(mockSendAbandonedCartEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: "Siam Ahmed",
          customerEmail: "siam@example.com",
          orderNumber: "VL-20261122-TEST01",
          total: 2520,
          items: expect.arrayContaining([
            expect.objectContaining({
              productName: "Heavyweight Graphic Tee",
              quantity: 2,
            }),
          ]),
        })
      );

      // Verify Idempotency entry in OrderHistory
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: "ord-test-01",
          notes: expect.stringContaining("ABANDONED_REMINDER_SENT"),
        }),
      });
    });

    it("skips candidate order if customer placed a subsequent non-cancelled order", async () => {
      const mockOrder = {
        id: "ord-test-old",
        orderNumber: "VL-20261122-OLD",
        userId: "usr-subsequent-check",
        customerName: "Siam",
        customerPhone: "01712345678",
        customerEmail: "siam@example.com",
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING",
        status: "PENDING",
        subtotal: 2000,
        total: 2120,
        createdAt: new Date(Date.now() - 50 * 60 * 1000),
        items: [],
      };

      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.cart.findMany.mockResolvedValue([]);
      // Customer subsequently placed another successful order
      mockPrisma.order.findFirst.mockResolvedValue({ id: "ord-new-confirmed" });

      const result = await processAbandonedReminders({ olderThanMinutes: 30 });

      expect(result.scannedOrders).toBe(1);
      expect(result.remindedOrders).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockSendSmsNotification).not.toHaveBeenCalled();
      expect(mockSendAbandonedCartEmail).not.toHaveBeenCalled();
    });

    it("respects dryRun option without sending notifications or creating history records", async () => {
      const mockOrder = {
        id: "ord-dry-01",
        orderNumber: "VL-20261122-DRY01",
        customerName: "Rahim Uddin",
        customerPhone: "01812345678",
        customerEmail: "rahim@example.com",
        paymentMethod: "ONLINE",
        paymentStatus: "FAILED",
        status: "PENDING",
        subtotal: 1800,
        total: 1920,
        createdAt: new Date(Date.now() - 40 * 60 * 1000),
        items: [],
      };

      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.cart.findMany.mockResolvedValue([]);

      const result = await processAbandonedReminders({
        olderThanMinutes: 30,
        dryRun: true,
      });

      expect(result.scannedOrders).toBe(1);
      expect(result.remindedOrders).toBe(1);
      expect(mockSendSmsNotification).not.toHaveBeenCalled();
      expect(mockSendAbandonedCartEmail).not.toHaveBeenCalled();
      expect(mockPrisma.orderHistory.create).not.toHaveBeenCalled();
    });

    it("handles fallback greeting when customerName is undefined, null, or empty", async () => {
      const mockOrder = {
        id: "ord-noname-01",
        orderNumber: "VL-20261122-NONAME",
        customerName: null,
        customerPhone: "+8801912345678",
        customerEmail: null,
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING",
        status: "PENDING",
        subtotal: 1500,
        total: 1620,
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
        items: [],
      };

      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.cart.findMany.mockResolvedValue([]);

      await processAbandonedReminders({ olderThanMinutes: 30 });

      expect(mockSendSmsNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "8801912345678",
          message: expect.stringContaining("সম্মানিত গ্রাহক"),
        })
      );
      expect(mockSendAbandonedCartEmail).not.toHaveBeenCalled();
    });

    it("handles 10-digit BD phone numbers and strips common honorifics (e.g. Md. Siam)", async () => {
      const mockOrder = {
        id: "ord-honorific-01",
        orderNumber: "VL-20261122-HONOR",
        customerName: "Md. Siam Ahmed",
        customerPhone: "1712345678", // 10 digits
        customerEmail: "siam@test.com",
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING",
        status: "PENDING",
        subtotal: 1800,
        total: 1920,
        createdAt: new Date(Date.now() - 40 * 60 * 1000),
        items: [],
      };

      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.cart.findMany.mockResolvedValue([]);

      await processAbandonedReminders({ olderThanMinutes: 30 });

      expect(mockSendSmsNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "8801712345678",
          message: expect.stringContaining("Siam"),
        })
      );
    });

    it("skips order if double-check reveals a competing worker already reminded it", async () => {
      const mockOrder = {
        id: "ord-race-01",
        orderNumber: "VL-20261122-RACE",
        customerName: "Siam",
        customerPhone: "01712345678",
        customerEmail: "siam@test.com",
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING",
        status: "PENDING",
        subtotal: 2000,
        total: 2120,
        createdAt: new Date(Date.now() - 40 * 60 * 1000),
        items: [],
      };

      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.cart.findMany.mockResolvedValue([]);
      // Double check in loop discovers a reminder was written by another thread
      mockPrisma.orderHistory.findFirst.mockResolvedValue({ id: "hist-existing" });

      const result = await processAbandonedReminders({ olderThanMinutes: 30 });

      expect(result.scannedOrders).toBe(1);
      expect(result.remindedOrders).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockSendSmsNotification).not.toHaveBeenCalled();
    });

    it("applies golden hybrid timing: 8-min checkout threshold and 30-min cart threshold by default", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.cart.findMany.mockResolvedValue([]);

      const beforeRun = Date.now();
      await processAbandonedReminders(); // No options passed -> defaults applied

      // Order query should use ~8 minutes cutoff
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
        })
      );
      const orderCallArgs = mockPrisma.order.findMany.mock.calls[0][0];
      const orderCutoff = orderCallArgs.where.createdAt.lte.getTime();
      const orderDiffMinutes = Math.round((beforeRun - orderCutoff) / (60 * 1000));
      expect(orderDiffMinutes).toBe(8);

      // Cart query should use ~30 minutes cutoff
      expect(mockPrisma.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
        })
      );
      const cartCallArgs = mockPrisma.cart.findMany.mock.calls[0][0];
      const cartCutoff = cartCallArgs.where.updatedAt.lte.getTime();
      const cartDiffMinutes = Math.round((beforeRun - cartCutoff) / (60 * 1000));
      expect(cartDiffMinutes).toBe(30);
    });
  });

  describe("processAbandonedReminders - Carts", () => {
    it("identifies active abandoned user carts and sends reminders if no recent order exists", async () => {
      const mockCart = {
        id: "cart-user-1",
        userId: "usr-101",
        updatedAt: new Date(Date.now() - 50 * 60 * 1000),
        user: {
          id: "usr-101",
          name: "Tanvir Hasan",
          email: "tanvir@vibelock.bd",
          phone: "01799887766",
        },
        items: [
          {
            id: "ci-1",
            quantity: 1,
            variant: {
              size: "XL",
              color: "Cyber Acid",
              sellingPrice: 2200,
              discountPrice: 1980,
              product: {
                name: "Cyberpunk Oversized Hoodie",
              },
            },
          },
        ],
      };

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.cart.findMany.mockResolvedValue([mockCart]);
      mockPrisma.order.findFirst.mockResolvedValue(null); // No recent order placed
      mockPrisma.auditLog.findFirst.mockResolvedValue(null); // No prior reminder sent

      const result = await processAbandonedReminders({ olderThanMinutes: 30 });

      expect(result.scannedCarts).toBe(1);
      expect(result.remindedCarts).toBe(1);
      expect(mockSendSmsNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "8801799887766",
          message: expect.stringContaining("Tanvir"),
          purpose: "abandoned_cart_recovery",
        })
      );
      expect(mockSendAbandonedCartEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: "Tanvir Hasan",
          customerEmail: "tanvir@vibelock.bd",
          total: 1980,
          items: expect.arrayContaining([
            expect.objectContaining({
              productName: "Cyberpunk Oversized Hoodie",
              lineTotal: 1980,
            }),
          ]),
        })
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "ABANDONED_CART_REMINDER",
          entityType: "CART",
          entityId: "cart-user-1",
        }),
      });
    });

    it("skips user cart if customer placed an order in the last 24 hours", async () => {
      const mockCart = {
        id: "cart-user-2",
        userId: "usr-102",
        updatedAt: new Date(Date.now() - 40 * 60 * 1000),
        user: {
          id: "usr-102",
          name: "Karim",
          email: "karim@test.com",
          phone: "01511223344",
        },
        items: [
          {
            quantity: 1,
            variant: {
              size: "M",
              color: "Ghost White",
              sellingPrice: 1500,
              discountPrice: null,
              product: { name: "Drop Shoulder Tee" },
            },
          },
        ],
      };

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.cart.findMany.mockResolvedValue([mockCart]);
      mockPrisma.order.findFirst.mockResolvedValue({ id: "recent-ord-1" }); // Recently placed order

      const result = await processAbandonedReminders();

      expect(result.scannedCarts).toBe(1);
      expect(result.remindedCarts).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockSendSmsNotification).not.toHaveBeenCalled();
      expect(mockSendAbandonedCartEmail).not.toHaveBeenCalled();
    });

    it("skips user cart if an abandoned reminder was already sent within 24 hours", async () => {
      const mockCart = {
        id: "cart-user-3",
        userId: "usr-103",
        updatedAt: new Date(Date.now() - 45 * 60 * 1000),
        user: {
          id: "usr-103",
          name: "Fahim",
          email: "fahim@test.com",
          phone: "01611223344",
        },
        items: [
          {
            quantity: 1,
            variant: {
              size: "L",
              color: "Charcoal",
              sellingPrice: 1600,
              discountPrice: null,
              product: { name: "Acid Wash Tee" },
            },
          },
        ],
      };

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.cart.findMany.mockResolvedValue([mockCart]);
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.auditLog.findFirst.mockResolvedValue({ id: "audit-prior-reminder" });

      const result = await processAbandonedReminders();

      expect(result.scannedCarts).toBe(1);
      expect(result.remindedCarts).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockSendSmsNotification).not.toHaveBeenCalled();
    });
  });

  describe("sendManualAbandonedOrderReminder", () => {
    it("successfully sends manual reminder for unpaid order", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord-manual-1",
        orderNumber: "VL-20261122-MANUAL",
        customerName: "Arafat",
        customerPhone: "01855667788",
        customerEmail: "arafat@example.com",
        paymentStatus: "PENDING",
        status: "PENDING",
        subtotal: 3000,
        total: 3120,
        items: [
          {
            productName: "Cargo Joggers",
            size: "32",
            color: "Military Olive",
            quantity: 1,
            unitPrice: 3000,
            lineTotal: 3000,
          },
        ],
      });

      const res = await sendManualAbandonedOrderReminder("VL-20261122-MANUAL");

      expect(res.success).toBe(true);
      expect(res.smsSent).toBe(true);
      expect(res.emailSent).toBe(true);
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: "ord-manual-1",
          notes: expect.stringContaining("MANUAL_ABANDONED_REMINDER_SENT"),
        }),
      });
    });

    it("rejects reminder if order is already paid", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord-paid-1",
        orderNumber: "VL-20261122-PAID",
        paymentStatus: "SUCCESS",
      });

      const res = await sendManualAbandonedOrderReminder("VL-20261122-PAID");

      expect(res.success).toBe(false);
      expect(res.error).toContain("already paid");
      expect(mockSendSmsNotification).not.toHaveBeenCalled();
    });

    it("rejects reminder if order is cancelled", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "ord-canc-1",
        orderNumber: "VL-20261122-CANC",
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
      });

      const res = await sendManualAbandonedOrderReminder("VL-20261122-CANC");

      expect(res.success).toBe(false);
      expect(res.error).toContain("cancelled");
      expect(mockSendSmsNotification).not.toHaveBeenCalled();
    });

    it("returns error if order does not exist", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const res = await sendManualAbandonedOrderReminder("VL-NONEXISTENT");

      expect(res.success).toBe(false);
      expect(res.error).toBe("Order not found");
    });
  });

  describe("Cron Route - /api/cron/abandoned-reminders", () => {
    it("returns 401 Unauthorized if neither CRON_SECRET nor staff session is present", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/abandoned-reminders", {
        method: "GET",
      });
      mockAuth.mockResolvedValue(null);

      const res = await GET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("accepts request with valid CRON_SECRET in Authorization header", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";

      const req = new NextRequest(
        "http://localhost:3000/api/cron/abandoned-reminders?olderThanMinutes=40&dryRun=true",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer super-secret-cron-token",
          },
        }
      );

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.cart.findMany.mockResolvedValue([]);

      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.scannedOrders).toBe(0);
    });

    it("accepts request with valid staff session", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      });

      const req = new NextRequest("http://localhost:3000/api/cron/abandoned-reminders", {
        method: "POST",
      });

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.cart.findMany.mockResolvedValue([]);

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("parses JSON payload in POST request with custom batch size and dryRun", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";

      const req = new NextRequest("http://localhost:3000/api/cron/abandoned-reminders", {
        method: "POST",
        headers: {
          Authorization: "Bearer super-secret-cron-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          olderThanMinutes: 45,
          maxBatchSize: 10,
          dryRun: true,
        }),
      });

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.cart.findMany.mockResolvedValue([]);

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
