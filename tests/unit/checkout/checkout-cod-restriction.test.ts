/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";

const { mockPrisma, mockSessionState } = vi.hoisted(() => {
  const mockTx: any = {
    $queryRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
  };

  const mockPrisma: any = {
    ...mockTx,
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx)),
  };

  const mockSessionState = {
    user: { id: "cust-uuid-101", email: "customer@vibelock.bd" } as any,
  };

  return { mockPrisma, mockSessionState };
});

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (mockSessionState.user ? { user: mockSessionState.user } : null)),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

const mockIsPaymentMethodEnabled = vi.fn();
vi.mock("@/lib/settings/payment-settings", () => ({
  isPaymentMethodEnabled: (code: string) => mockIsPaymentMethodEnabled(code),
}));

vi.mock("@/lib/cart/queries", () => ({
  getCart: vi.fn(async () => null),
}));

vi.mock("@/lib/shipping/pricing", () => ({
  shippingPricing: {
    resolveShippingMethod: vi.fn(),
    calculateShippingCharge: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createOrderAction, isCustomerCodRestricted } from "@/lib/checkout/actions";
import { getCart } from "@/lib/cart/queries";

describe("Phase 5B-2 — Dedicated Customer COD Restriction State & Checkout Row Locking", () => {
  const validCheckoutPayload = {
    customerName: "Siam Saddan",
    customerEmail: "customer@vibelock.bd",
    customerPhone: "01711223344",
    shippingStreet: "Road 10, Sector 4, Uttara",
    shippingCity: "Dhaka",
    shippingState: "Dhaka",
    shippingZip: "1230",
    shippingCountry: "BD",
    shippingMethodId: "123e4567-e89b-12d3-a456-426614174000",
    paymentMethod: "COD" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionState.user = { id: "cust-uuid-101", email: "customer@vibelock.bd" };
    mockIsPaymentMethodEnabled.mockResolvedValue(true);
    mockPrisma.order.findUnique.mockResolvedValue(null);
  });

  describe("1. isCustomerCodRestricted authoritative helper", () => {
    test("pre-flight (no tx): returns true when user.codBlocked is true", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "cust-uuid-101",
        role: "CUSTOMER",
        codBlocked: true,
      });

      const result = await isCustomerCodRestricted("cust-uuid-101");
      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "cust-uuid-101" },
        select: { codBlocked: true, role: true },
      });
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    test("pre-flight (no tx): returns false when user.codBlocked is false", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "cust-uuid-101",
        role: "CUSTOMER",
        codBlocked: false,
      });

      const result = await isCustomerCodRestricted("cust-uuid-101");
      expect(result).toBe(false);
    });

    test("pre-flight (no tx): throws CUSTOMER_NOT_FOUND when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(isCustomerCodRestricted("cust-uuid-missing")).rejects.toThrow("CUSTOMER_NOT_FOUND");
    });

    test("in-transaction (tx provided): executes parameterized SELECT FOR UPDATE row lock on User", async () => {
      const mockCustomTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([{ id: "cust-uuid-101", codBlocked: true }]),
      };

      const result = await isCustomerCodRestricted("cust-uuid-101", mockCustomTx as any);
      expect(result).toBe(true);
      expect(mockCustomTx.$queryRaw).toHaveBeenCalledTimes(1);

      const call = vi.mocked(mockCustomTx.$queryRaw).mock.calls[0];
      const queryStrings = (call[0] as unknown as string[]).join(" ");
      expect(queryStrings).toContain("SELECT \"id\", \"codBlocked\"");
      expect(queryStrings).toContain("FROM \"User\"");
      expect(queryStrings).toContain("'CUSTOMER'::\"Role\"");
      expect(queryStrings).toContain("FOR UPDATE");
    });

    test("in-transaction (tx provided): throws CUSTOMER_NOT_FOUND when row lock returns empty", async () => {
      const mockCustomTx = {
        $queryRaw: vi.fn().mockResolvedValueOnce([]),
      };

      await expect(
        isCustomerCodRestricted("cust-uuid-missing", mockCustomTx as any)
      ).rejects.toThrow("CUSTOMER_NOT_FOUND");
    });
  });

  describe("2. createOrderAction COD restriction enforcement with row locking", () => {
    test("rejects COD order placement during pre-flight when customer codBlocked is true", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "cust-uuid-101",
        role: "CUSTOMER",
        codBlocked: true,
      });

      const result = await createOrderAction(
        validCheckoutPayload,
        "idempotency-key-blocked-cod"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Cash on delivery is not available for your account. Please choose another payment method."
      );
      // Fails fast before transaction opens
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    test("allows order placement to proceed to cart verification when customer codBlocked is false", async () => {
      // 1. Pre-flight check passes
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "cust-uuid-101",
        role: "CUSTOMER",
        codBlocked: false,
      });

      const result = await createOrderAction(
        validCheckoutPayload,
        "idempotency-key-unrestricted-cod"
      );

      // Reaches cart check (getCart returns null in mock -> "Your cart is empty")
      // Proving COD restriction passed!
      expect(result.success).toBe(false);
      expect(result.error).toBe("Your cart is empty");
    });

    test("in-transaction check rejects and aborts transaction if customer was blocked concurrently", async () => {
      // Pre-flight check sees false
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "cust-uuid-101",
        role: "CUSTOMER",
        codBlocked: false,
      });

      // Cart mock outside transaction
      vi.mocked(getCart).mockResolvedValueOnce({
        id: "cart-1",
        totalQuantity: 1,
        subtotal: 100,
        items: [
          {
            id: "ci-1",
            variantId: "v-1",
            quantity: 1,
            availableQuantity: 5,
            variant: { available: true },
          } as any,
        ],
      } as any);

      // Cart mock inside transaction (supports cart ID lookup and subsequent items fetch under row lock)
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: "cart-1",
        items: [{ id: "item-1" }],
      });

      // Mock $queryRaw to handle Cart row lock first, then return newly committed codBlocked: true on User
      mockPrisma.$queryRaw.mockImplementation(async (query: any) => {
        const sql = query?.strings?.join(" ") || String(query);
        if (sql.includes('"Cart"')) {
          return [{ id: "cart-1" }];
        }
        return [{ id: "cust-uuid-101", codBlocked: true }];
      });

      const result = await createOrderAction(
        validCheckoutPayload,
        "idempotency-key-concurrent-block"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Cash on delivery is not available for your account. Please choose another payment method."
      );
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });

    test("fails closed if customer COD verification encounters a database error", async () => {
      mockPrisma.user.findUnique.mockRejectedValueOnce(new Error("Database connection pool timeout"));

      const result = await createOrderAction(
        validCheckoutPayload,
        "idempotency-key-db-error"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Unable to verify payment method eligibility. Please try again or choose an online payment method."
      );
    });

    test("prioritizes store-wide COD disabled setting before customer restriction lookup", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValueOnce(false);

      const result = await createOrderAction(
        validCheckoutPayload,
        "idempotency-key-storewide-disabled"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Cash on delivery is currently unavailable. Please choose another payment method."
      );
      // User table should not even be queried if storewide COD is off
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("does not block non-COD payment methods (ONLINE, BKASH, NAGAD) for COD-blocked customers", async () => {
      // Store settings allow ONLINE
      mockIsPaymentMethodEnabled.mockImplementation(async (code: string) => code === "ONLINE");

      const result = await createOrderAction(
        { ...validCheckoutPayload, paymentMethod: "ONLINE" },
        "idempotency-key-online-allowed"
      );

      // Successfully bypassed COD check, stopped at cart check
      expect(result.success).toBe(false);
      expect(result.error).toBe("Your cart is empty");
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    test("rejects unauthenticated user without performing COD restriction lookup", async () => {
      mockSessionState.user = null;

      const result = await createOrderAction(
        validCheckoutPayload,
        "idempotency-key-unauthenticated"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("3. In-Transaction User Row Locking for ALL Checkout Methods (SEC-9-06)", () => {
    test("acquires exclusive User row lock before Cart or Order creation when paymentMethod is ONLINE", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValue(true);
      vi.mocked(getCart).mockResolvedValueOnce({
        id: "cart-online",
        totalQuantity: 1,
        subtotal: 100,
        items: [{ id: "ci-1", variantId: "v-1", quantity: 1, availableQuantity: 5, variant: { available: true } } as any],
      } as any);

      const queryLog: string[] = [];
      mockPrisma.$queryRaw.mockImplementation(async (query: any) => {
        const sql = query?.strings?.join(" ") || String(query);
        if (sql.includes('"User"')) {
          queryLog.push("lock:User");
          return [{ id: "cust-uuid-101", codBlocked: false }];
        }
        if (sql.includes('"Cart"')) {
          queryLog.push("lock:Cart");
          return [{ id: "cart-online" }];
        }
        return [];
      });

      mockPrisma.cart.findUnique.mockImplementation(async (args: any) => {
        if (args?.select?.id) return { id: "cart-online" };
        return {
          id: "cart-online",
          items: [],
        };
      });

      await createOrderAction(
        { ...validCheckoutPayload, paymentMethod: "ONLINE" },
        "idempotency-key-online-lock-test"
      );

      expect(queryLog).toContain("lock:User");
      expect(queryLog[0]).toBe("lock:User");
    });

    test("acquires exclusive User row lock before Cart or Order creation when paymentMethod is BKASH or NAGAD", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValue(true);
      vi.mocked(getCart).mockResolvedValueOnce({
        id: "cart-bkash",
        totalQuantity: 1,
        subtotal: 100,
        items: [{ id: "ci-1", variantId: "v-1", quantity: 1, availableQuantity: 5, variant: { available: true } } as any],
      } as any);

      const queryLog: string[] = [];
      mockPrisma.$queryRaw.mockImplementation(async (query: any) => {
        const sql = query?.strings?.join(" ") || String(query);
        if (sql.includes('"User"')) {
          queryLog.push("lock:User");
          return [{ id: "cust-uuid-101", codBlocked: false }];
        }
        return [];
      });

      mockPrisma.cart.findUnique.mockImplementation(async (args: any) => {
        if (args?.select?.id) return { id: "cart-bkash" };
        return { id: "cart-bkash", items: [] };
      });

      await createOrderAction(
        { ...validCheckoutPayload, paymentMethod: "BKASH" },
        "idempotency-key-bkash-lock-test"
      );

      expect(queryLog).toContain("lock:User");
      expect(queryLog[0]).toBe("lock:User");
    });

    test("allows online checkout even if customer has codBlocked = true, without throwing COD_RESTRICTED", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValue(true);
      vi.mocked(getCart).mockResolvedValueOnce({
        id: "cart-online-blocked",
        totalQuantity: 1,
        subtotal: 100,
        items: [{ id: "ci-1", variantId: "v-1", quantity: 1, availableQuantity: 5, variant: { available: true } } as any],
      } as any);

      mockPrisma.$queryRaw.mockImplementation(async (query: any) => {
        const sql = query?.strings?.join(" ") || String(query);
        if (sql.includes('"User"')) {
          return [{ id: "cust-uuid-101", codBlocked: true }];
        }
        return [{ id: "cart-online-blocked" }];
      });

      mockPrisma.cart.findUnique.mockImplementation(async (args: any) => {
        if (args?.select?.id) return { id: "cart-online-blocked" };
        return { id: "cart-online-blocked", items: [] };
      });

      const result = await createOrderAction(
        { ...validCheckoutPayload, paymentMethod: "ONLINE" },
        "idempotency-key-online-not-blocked"
      );

      expect(result.error).not.toBe("Cash on delivery is not available for your account. Please choose another payment method.");
      expect(result.error).toBe("Your cart is empty.");
    });

    test("fails closed if customer is not found or was deleted during checkout lock acquisition", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValue(true);
      vi.mocked(getCart).mockResolvedValueOnce({
        id: "cart-missing-user",
        totalQuantity: 1,
        subtotal: 100,
        items: [{ id: "ci-1", variantId: "v-1", quantity: 1, availableQuantity: 5, variant: { available: true } } as any],
      } as any);

      mockPrisma.$queryRaw.mockImplementation(async (query: any) => {
        const sql = query?.strings?.join(" ") || String(query);
        if (sql.includes('"User"')) {
          return [];
        }
        return [{ id: "cart-missing-user" }];
      });

      const result = await createOrderAction(
        { ...validCheckoutPayload, paymentMethod: "ONLINE" },
        "idempotency-key-user-deleted"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer account not found or no longer active.");
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });
  });
});
