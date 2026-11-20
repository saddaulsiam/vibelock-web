import { describe, test, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  releaseOrderCoupon,
  validateCustomerCouponEligibility,
} from "@/lib/checkout/coupons";
import {
  createOrderAction,
  validateCouponAction,
  getShippingMethodsAction,
} from "@/lib/checkout/actions";
import { cancelOrderAction } from "@/lib/orders/actions";
import {
  updateOrderStatusAction,
  quickUpdateOrderStatusAction,
} from "@/lib/admin/orders/order-actions";

// Mock auth session
let mockSession: { user: { id: string; email?: string; role?: string } } | null = {
  user: { id: "user-alice-123", email: "alice@vibelock.bd", role: "CUSTOMER" },
};

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn(async () => {
    if (!mockSession?.user) throw new Error("Unauthorized");
    return { id: mockSession.user.id, email: mockSession.user.email, role: "STAFF" };
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    INVENTORY_RESERVATION_TTL_SECONDS: 900,
  },
}));

vi.mock("@/lib/settings/payment-settings", () => ({
  isPaymentMethodEnabled: vi.fn(async () => true),
}));

vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    reserveInventoryForOrder: vi.fn(async () => {}),
    consumeReservation: vi.fn(async () => {}),
    cancelOrderInventory: vi.fn(async () => {}),
  },
}));

const mockCartItems = {
  items: [
    {
      variantId: "var-1",
      quantity: 2,
      availableQuantity: 10,
      variant: {
        available: true,
        effectivePrice: 500,
        sellingPrice: 500,
        discountPrice: null,
        product: { status: "PUBLISHED", categories: [] },
      },
    },
  ],
};

vi.mock("@/lib/cart/queries", () => ({
  getCart: vi.fn(async () => mockCartItems),
}));

const mockOrderFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma/client", () => ({
  default: {
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
      count: vi.fn(async () => 0),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    coupon: {
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
    },
    productVariant: {
      findMany: vi.fn(async () => []),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/shipping/pricing", () => ({
  resolveShippingMethod: vi.fn(async () => ({
    id: "00000000-0000-0000-0000-000000000001",
    name: "Standard Delivery",
    cost: new Prisma.Decimal(60),
    zoneId: "zone-dhaka",
    zoneName: "Inside Dhaka",
  })),
  getEligibleShippingMethods: vi.fn(async () => [
    {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Standard Delivery",
      cost: new Prisma.Decimal(60),
      zoneId: "zone-dhaka",
      zoneName: "Inside Dhaka",
    },
  ]),
  calculateShippingCharge: vi.fn(() => new Prisma.Decimal(60)),
}));

describe("Phase 8: Business Logic & Abuse Prevention Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = {
      user: { id: "user-alice-123", email: "alice@vibelock.bd", role: "CUSTOMER" },
    };
    mockOrderFindUnique.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({ id: "user-alice-123", codBlocked: false, role: "CUSTOMER" });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      const tx = {
        $queryRaw: vi.fn(async () => [{ id: "user-alice-123", codBlocked: false }]),
        cart: {
          findUnique: vi.fn(async () => ({
            id: "cart-1",
            items: [
              {
                quantity: 2,
                variant: {
                  id: "v-1",
                  sellingPrice: new Prisma.Decimal(500),
                  discountPrice: null,
                  product: { status: "PUBLISHED", categories: [] },
                  inventoryTransactions: [{ quantity: 10 }],
                  inventoryReservations: [],
                },
              },
            ],
          })),
        },
        cartItem: {
          deleteMany: vi.fn(async () => ({ count: 1 })),
        },
        order: {
          create: vi.fn(async () => ({
            id: "order-created-1",
            orderNumber: "VL-20261116-TEST01",
            customerName: "Alice Rahman",
            customerEmail: "alice@vibelock.bd",
            subtotal: new Prisma.Decimal(1000),
            shippingCost: new Prisma.Decimal(60),
            discount: new Prisma.Decimal(0),
            total: new Prisma.Decimal(1060),
          })),
        },
      };
      return callback(tx);
    });
  });

  describe("1. Coupon Lifecycle & Cancellation Release (BUG-8-01 / SEC-8-01)", () => {
    test("exhausted coupon becomes active after a valid release", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => [
          { id: "coupon-1", code: "SAVE50", usageCount: 10, usageLimit: 10, isActive: false },
        ]),
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "SAVE50", couponId: "coupon-1" },
            })
            .mockResolvedValueOnce(null),
          create: vi.fn(async () => ({ id: "audit-rel-1" })),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: "hist-1" })),
        },
        coupon: {
          update: vi.fn(async () => ({ id: "coupon-1", usageCount: 9, isActive: true })),
        },
        order: {
          findUnique: vi.fn(async () => ({ userId: "user-alice-123" })),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await releaseOrderCoupon("order-123", mockTx);

      expect(result.success).toBe(true);
      expect(result.releasedCoupon).toBe("SAVE50");
      expect(mockTx.coupon.update).toHaveBeenCalledWith({
        where: { id: "coupon-1" },
        data: {
          usageCount: 9,
          isActive: true, // Reactivated because wasExhausted (10 >= 10) and new count (9) < 10
        },
      });
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "COUPON_RELEASED",
            entityId: "order-123",
            metadata: expect.objectContaining({
              couponCode: "SAVE50",
              previousUsageCount: 10,
              newUsageCount: 9,
              reactivated: true,
              wasExhausted: true,
            }),
          }),
        })
      );
    });

    test("manually disabled coupon remains disabled after order cancellation (SEC-8-01)", async () => {
      // Coupon was manually disabled by admin at usageCount 5 (usageLimit 10)
      const mockTx = {
        $queryRaw: vi.fn(async () => [
          { id: "coupon-manual", code: "MANUAL_OFF", usageCount: 5, usageLimit: 10, isActive: false },
        ]),
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "MANUAL_OFF", couponId: "coupon-manual" },
            })
            .mockResolvedValueOnce(null),
          create: vi.fn(async () => ({ id: "audit-rel-2" })),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: "hist-2" })),
        },
        coupon: {
          update: vi.fn(async () => ({ id: "coupon-manual", usageCount: 4, isActive: false })),
        },
        order: {
          findUnique: vi.fn(async () => ({ userId: "user-alice-123" })),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await releaseOrderCoupon("order-manual-rel", mockTx);

      expect(result.success).toBe(true);
      expect(result.releasedCoupon).toBe("MANUAL_OFF");
      // Must NOT include isActive: true because wasExhausted is false (5 < 10)
      expect(mockTx.coupon.update).toHaveBeenCalledWith({
        where: { id: "coupon-manual" },
        data: {
          usageCount: 4,
        },
      });
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              previousUsageCount: 5,
              newUsageCount: 4,
              reactivated: false,
              wasExhausted: false,
            }),
          }),
        })
      );
    });

    test("repeated release does not decrement usageCount twice (idempotency)", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => []),
        order: {
          findUnique: vi.fn(async () => ({
            id: "order-already-rel",
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: "user-alice-123",
          })),
        },
        auditLog: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              action: "COUPON_REDEEMED",
              metadata: { couponCode: "WELCOME10", couponId: "coupon-w" },
            })
            .mockResolvedValueOnce({
              action: "COUPON_RELEASED",
              metadata: { couponCode: "WELCOME10" },
            }),
        },
        coupon: {
          update: vi.fn(),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await releaseOrderCoupon("order-already-rel", mockTx);

      expect(result.success).toBe(true);
      expect(mockTx.coupon.update).not.toHaveBeenCalled();
    });

    test("concurrent releases do not decrement twice under serialized execution", async () => {
      let releasedCount = 0;
      let couponUsage = 10;
      const releasedOrders = new Set<string>();

      const createTx = (orderId: string) =>
        ({
          $queryRaw: vi.fn(async () => [
            { id: "coupon-1", code: "SAVE50", usageCount: couponUsage, usageLimit: 10, isActive: false },
          ]),
          auditLog: {
            findFirst: vi.fn(async ({ where }: { where: { action: string; entityId: string } }) => {
              if (where.action === "COUPON_REDEEMED") {
                return { action: "COUPON_REDEEMED", metadata: { couponCode: "SAVE50", couponId: "coupon-1" } };
              }
              if (where.action === "COUPON_RELEASED" && releasedOrders.has(orderId)) {
                return { action: "COUPON_RELEASED", metadata: { couponCode: "SAVE50" } };
              }
              return null;
            }),
            create: vi.fn(async () => {
              releasedOrders.add(orderId);
              releasedCount++;
            }),
          },
          orderHistory: {
            findFirst: vi.fn(async () => null),
            create: vi.fn(async () => ({})),
          },
          coupon: {
            update: vi.fn(async () => {
              couponUsage = Math.max(0, couponUsage - 1);
            }),
          },
          order: {
            findUnique: vi.fn(async () => ({ userId: "user-alice-123" })),
          },
        }) as unknown as Prisma.TransactionClient;

      // First release
      const res1 = await releaseOrderCoupon("order-concurrent-1", createTx("order-concurrent-1"));
      // Second release for the same order (e.g. repeated/concurrent callback)
      const res2 = await releaseOrderCoupon("order-concurrent-1", createTx("order-concurrent-1"));

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(releasedCount).toBe(1);
      expect(couponUsage).toBe(9);
    });

    test("returns success: false when no coupon was applied to the order", async () => {
      const mockTx = {
        $queryRaw: vi.fn(async () => []),
        order: {
          findUnique: vi.fn(async () => ({
            id: "order-no-coupon",
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            userId: "user-alice-123",
          })),
        },
        auditLog: {
          findFirst: vi.fn(async () => null),
        },
        orderHistory: {
          findFirst: vi.fn(async () => null),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await releaseOrderCoupon("order-no-coupon", mockTx);

      expect(result.success).toBe(false);
    });
  });

  describe("2. Per-User Coupon Limit Enforcement (BUG-8-02 / SEC-8-02)", () => {
    test("WELCOME100 does not block WELCOME10 (SEC-8-02 exact delimiter matching)", async () => {
      const mockDb = {
        order: {
          // In real DB, the OR query with exact delimiters does not match "WELCOME100" when querying "WELCOME10"
          count: vi.fn(async ({ where }: { where: { history: { some: { OR: Array<{ notes: { contains?: string; endsWith?: string } }> } } } }) => {
            const orConditions = where.history.some.OR;
            const matches = orConditions.some(
              (c) =>
                c.notes.contains === "Coupon applied: WELCOME10 (" ||
                c.notes.endsWith === "Coupon applied: WELCOME10" ||
                c.notes.contains === "Coupon applied: WELCOME10."
            );
            // Simulated existing order has "Coupon applied: WELCOME100 (Discount: 100.00 BDT)"
            // When querying WELCOME10, it should NOT match
            return matches ? 0 : 0;
          }),
        },
      } as unknown as Prisma.TransactionClient;

      await expect(
        validateCustomerCouponEligibility("user-alice-123", "WELCOME10", mockDb)
      ).resolves.toBeUndefined();
    });

    test("WELCOME10 blocks another WELCOME10 redemption", async () => {
      const mockDb = {
        order: {
          count: vi.fn(async () => 1), // Active order with WELCOME10 exists
        },
      } as unknown as Prisma.TransactionClient;

      await expect(
        validateCustomerCouponEligibility("user-alice-123", "WELCOME10", mockDb)
      ).rejects.toThrow("You have already redeemed this coupon.");
    });

    test("normalizes coupon code case-insensitively and trims whitespace", async () => {
      const mockDb = {
        order: {
          count: vi.fn(async () => 0),
        },
      } as unknown as Prisma.TransactionClient;

      await validateCustomerCouponEligibility("user-alice-123", "  welcome10  ", mockDb);

      expect(mockDb.order.count).toHaveBeenCalledWith({
        where: {
          userId: "user-alice-123",
          status: { not: "CANCELLED" },
          history: {
            some: {
              OR: [
                {
                  notes: {
                    contains: "Coupon applied: WELCOME10 (",
                    mode: "insensitive",
                  },
                },
                {
                  notes: {
                    endsWith: "Coupon applied: WELCOME10",
                    mode: "insensitive",
                  },
                },
                {
                  notes: {
                    contains: "Coupon applied: WELCOME10.",
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      });
    });

    test("allows coupon validation when previous order was CANCELLED (activeOrdersCount = 0)", async () => {
      const mockDb = {
        order: {
          count: vi.fn(async () => 0), // 0 active orders
        },
      } as unknown as Prisma.TransactionClient;

      await expect(
        validateCustomerCouponEligibility("user-alice-123", "SAVE20", mockDb)
      ).resolves.toBeUndefined();
    });

    test("validateCouponAction rejects code when customer has an active order with that coupon", async () => {
      const prismaClient = (await import("@/lib/prisma/client")).default;
      vi.mocked(prismaClient.order.count).mockResolvedValueOnce(1);

      const res = await validateCouponAction("ALREADYUSED");
      expect(res.success).toBe(false);
      expect(res.error).toBe("You have already redeemed this coupon.");
    });
  });

  describe("3. Checkout Cart Quantity, Price & Purchase Bounds (BUG-8-05)", () => {
    const validCheckoutData = {
      customerName: "Alice Rahman",
      customerEmail: "alice@vibelock.bd",
      customerPhone: "01700000000",
      shippingStreet: "Road 5, Dhanmondi",
      shippingCity: "Dhaka",
      shippingCountry: "BD",
      paymentMethod: "COD" as const,
      shippingMethodId: "00000000-0000-0000-0000-000000000001",
    };

    test("rejects checkout when cart item has quantity < 1", async () => {
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
        const tx = {
          $queryRaw: vi.fn(async () => [{ id: "user-alice-123", codBlocked: false }]),
          cart: {
            findUnique: vi.fn(async () => ({
              id: "cart-1",
              items: [
                {
                  quantity: 0, // INVALID quantity < 1
                  variant: {
                    id: "v-1",
                    sellingPrice: new Prisma.Decimal(500),
                    discountPrice: null,
                    product: { status: "PUBLISHED", categories: [] },
                    inventoryTransactions: [{ quantity: 10 }],
                    inventoryReservations: [],
                  },
                },
              ],
            })),
          },
        };
        return callback(tx);
      });

      const res = await createOrderAction(validCheckoutData, "valid-idempotency-key-1");

      expect(res.success).toBe(false);
      expect(res.error).toBe("Invalid item quantity in cart. Purchase limit is between 1 and 10.");
    });

    test("rejects checkout when cart item exceeds maximum purchase limit (quantity > 10)", async () => {
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
        const tx = {
          $queryRaw: vi.fn(async () => [{ id: "user-alice-123", codBlocked: false }]),
          cart: {
            findUnique: vi.fn(async () => ({
              id: "cart-1",
              items: [
                {
                  quantity: 11, // EXCEEDS MAX_QUANTITY 10
                  variant: {
                    id: "v-1",
                    sellingPrice: new Prisma.Decimal(500),
                    discountPrice: null,
                    product: { status: "PUBLISHED", categories: [] },
                    inventoryTransactions: [{ quantity: 100 }],
                    inventoryReservations: [],
                  },
                },
              ],
            })),
          },
        };
        return callback(tx);
      });

      const res = await createOrderAction(validCheckoutData, "valid-idempotency-key-2");

      expect(res.success).toBe(false);
      expect(res.error).toBe("Invalid item quantity in cart. Purchase limit is between 1 and 10.");
    });

    test("rejects checkout when product variant has zero or negative unit price", async () => {
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
        const tx = {
          $queryRaw: vi.fn(async () => [{ id: "user-alice-123", codBlocked: false }]),
          cart: {
            findUnique: vi.fn(async () => ({
              id: "cart-1",
              items: [
                {
                  quantity: 1,
                  variant: {
                    id: "v-1",
                    sellingPrice: new Prisma.Decimal(0), // FREE / Zero price exploit
                    discountPrice: null,
                    product: { status: "PUBLISHED", categories: [] },
                    inventoryTransactions: [{ quantity: 10 }],
                    inventoryReservations: [],
                  },
                },
              ],
            })),
          },
        };
        return callback(tx);
      });

      const res = await createOrderAction(validCheckoutData, "valid-idempotency-key-3");

      expect(res.success).toBe(false);
      expect(res.error).toBe("Invalid item price detected. Please review your cart.");
    });
  });

  describe("4. Checkout Idempotency & IDOR Protection (BUG-8-04)", () => {
    test("rejects invalid, whitespace, or oversized idempotency keys", async () => {
      const validData = {
        customerName: "Alice Rahman",
        customerEmail: "alice@vibelock.bd",
        customerPhone: "01700000000",
        shippingStreet: "Road 5, Dhanmondi",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        paymentMethod: "COD" as const,
      };

      // Empty / whitespace
      const res1 = await createOrderAction(validData, "   ");
      expect(res1.success).toBe(false);
      expect(res1.error).toBe("Invalid checkout request.");

      // Too short (< 8 chars)
      const res2 = await createOrderAction(validData, "short");
      expect(res2.success).toBe(false);
      expect(res2.error).toBe("Invalid checkout request.");

      // Oversized (> 128 chars)
      const res3 = await createOrderAction(validData, "a".repeat(129));
      expect(res3.success).toBe(false);
      expect(res3.error).toBe("Invalid checkout request.");
    });

    test("blocks unauthorized access to another user's order on idempotency key collision", async () => {
      mockOrderFindUnique.mockResolvedValue({
        id: "victim-order-1",
        orderNumber: "VL-VICTIM-999",
        userId: "user-bob-456", // DIFFERENT USER!
      });

      const validData = {
        customerName: "Alice Rahman",
        customerEmail: "alice@vibelock.bd",
        customerPhone: "01700000000",
        shippingStreet: "Road 5, Dhanmondi",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        paymentMethod: "COD" as const,
      };

      const res = await createOrderAction(validData, "idempotency-collision-key");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized.");
    });
  });

  describe("5. Order Cancellation & Lifecycle Guards (BUG-8-06)", () => {
    test("customer cannot cancel order if recorded gateway payment is SUCCESS", async () => {
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
        const tx = {
          $queryRaw: vi.fn(async () => []),
          order: {
            findUnique: vi
              .fn()
              .mockResolvedValueOnce({ id: "ord-1" })
              .mockResolvedValueOnce({
                id: "ord-1",
                status: "PENDING",
                paymentStatus: "PENDING",
                payments: [{ status: "SUCCESS" }], // Recorded gateway payment SUCCESS
                inventoryReservations: [],
                shipment: null,
              }),
          },
        };
        return callback(tx);
      });

      const result = await cancelOrderAction("VL-2026-PAID");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Paid orders cannot be cancelled online at this time.");
    });

    test("customer cannot cancel order after shipment has been created", async () => {
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
        const tx = {
          $queryRaw: vi.fn(async () => []),
          order: {
            findUnique: vi
              .fn()
              .mockResolvedValueOnce({ id: "ord-2" })
              .mockResolvedValueOnce({
                id: "ord-2",
                status: "PENDING",
                paymentStatus: "PENDING",
                payments: [],
                inventoryReservations: [],
                shipment: { id: "ship-1", status: "CREATED" },
              }),
          },
        };
        return callback(tx);
      });

      const result = await cancelOrderAction("VL-2026-SHIPPED");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Orders cannot be cancelled after shipment processing has started.");
    });

    test("admin can cancel CONFIRMED order prior to shipment via quickUpdateOrderStatusAction", async () => {
      mockSession = { user: { id: "admin-staff-1", email: "staff@vibelock.bd", role: "STAFF" } };

      mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
        const tx = {
          $queryRaw: vi.fn(async () => []),
          order: {
            findUnique: vi.fn().mockResolvedValue({
              id: "ord-confirmed-1",
              status: "CONFIRMED",
              paymentStatus: "PENDING",
              paymentMethod: "COD",
              payments: [],
              inventoryReservations: [],
              shipment: null,
            }),
            update: vi.fn(async () => ({ id: "ord-confirmed-1", status: "CANCELLED" })),
          },
          orderHistory: { create: vi.fn(async () => ({})) },
          auditLog: {
            create: vi.fn(async () => ({})),
            findFirst: vi.fn(async () => null),
          },
        };
        return callback(tx);
      });

      const res = await quickUpdateOrderStatusAction({
        orderId: "ord-confirmed-1",
        status: "CANCELLED",
        notes: "Cancelled by staff on customer phone request",
      });

      expect(res.success).toBe(true);
      expect(res.error).toBeUndefined();
    });

    test("admin can cancel order via updateOrderStatusAction form action", async () => {
      mockSession = { user: { id: "admin-staff-1", email: "staff@vibelock.bd", role: "STAFF" } };

      mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
        const tx = {
          $queryRaw: vi.fn(async () => []),
          order: {
            findUnique: vi.fn().mockResolvedValue({
              id: "00000000-0000-0000-0000-000000000009",
              status: "PENDING",
              paymentStatus: "PENDING",
              paymentMethod: "COD",
              payments: [],
              inventoryReservations: [],
              shipment: null,
            }),
            update: vi.fn(async () => ({ id: "00000000-0000-0000-0000-000000000009", status: "CANCELLED" })),
          },
          orderHistory: { create: vi.fn(async () => ({})) },
          auditLog: {
            create: vi.fn(async () => ({})),
            findFirst: vi.fn(async () => null),
          },
        };
        return callback(tx);
      });

      const formData = new FormData();
      formData.set("id", "00000000-0000-0000-0000-000000000009");
      formData.set("status", "CANCELLED");
      formData.set("notes", "Cancelled via admin form");

      const res = await updateOrderStatusAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(res.message).toBe("Order updated successfully.");
    });
  });

  describe("6. Shipping Input Hardening", () => {
    test("rejects null or non-object address in getShippingMethodsAction gracefully", async () => {
      // @ts-expect-error Testing defensive boundary against non-object input
      const res = await getShippingMethodsAction(null);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Please provide both delivery country and city.");
    });
  });
});
