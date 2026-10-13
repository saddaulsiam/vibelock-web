/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    SSLCOMMERZ_STORE_ID: "vibelock_ssl_store",
    SSLCOMMERZ_STORE_PASSWORD: "vibelock_ssl_passwd",
    SSLCOMMERZ_SANDBOX: true,
    BKASH_APP_KEY: "mock_bkash_app_key",
    BKASH_APP_SECRET: "mock_bkash_app_secret",
    BKASH_USERNAME: "mock_bkash_username",
    BKASH_PASSWORD: "mock_bkash_password",
    BKASH_SANDBOX: true,
    INVENTORY_RESERVATION_TTL_SECONDS: 600,
  },
}));

vi.mock("@/lib/config/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/config/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: "https://vibelockbd.vercel.app",
  },
}));

let mockSession: unknown = { user: { id: "user-mock-uuid", email: "customer@vibelock.com" } };

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

const mockIsPaymentMethodEnabled = vi.fn();

vi.mock("@/lib/settings/payment-settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings/payment-settings")>();
  return {
    ...actual,
    isPaymentMethodEnabled: (code: string) => mockIsPaymentMethodEnabled(code),
  };
});

let mockCartData: any = null;

vi.mock("@/lib/cart/queries", () => ({
  getCart: vi.fn(async () => mockCartData),
}));

vi.mock("@/lib/shipping/pricing", () => ({
  resolveShippingMethod: vi.fn(async () => ({
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Standard Delivery",
    cost: 60,
  })),
  calculateShippingCharge: vi.fn(() => 60),
  getEligibleShippingMethods: vi.fn(async () => [
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Standard Delivery",
      cost: 60,
      zoneId: "zone-1",
      zoneName: "Dhaka Metro",
    },
  ]),
}));

const mockReserveInventory = vi.fn<(orderId: string, tx: any) => Promise<void>>(async () => {});
const mockConsumeReservation = vi.fn<(orderId: string, tx: any) => Promise<void>>(async () => {});
const mockReleaseReservation = vi.fn<(orderId: string, tx: any) => Promise<void>>(async () => {});

vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    reserveInventoryForOrder: (orderId: string, tx: any) => mockReserveInventory(orderId, tx),
    consumeReservation: (orderId: string, tx: any) => mockConsumeReservation(orderId, tx),
    releaseReservation: (orderId: string, tx: any) => mockReleaseReservation(orderId, tx),
    calculateAvailableQuantity: vi.fn(async () => 10),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const createdOrders: any[] = [];
const createdPayments: any[] = [];

const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    productVariant: {
      findMany: vi.fn(),
    },
    inventoryTransaction: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    inventoryReservation: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    orderHistory: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mock)),
    $queryRaw: vi.fn(async () => []),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma/client", () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { createOrderAction } from "@/lib/checkout/actions";
import { PaymentService } from "@/lib/payment/service";

describe("Phase 2D — bKash Checkout Integration", () => {
  const originalFetch = global.fetch;

  const validCheckoutPayload = {
    customerName: "Siam Saddaul",
    customerEmail: "siam@vibelock.com",
    customerPhone: "01712345678",
    shippingStreet: "Road 10, House 25, Banani",
    shippingCity: "Dhaka",
    shippingState: "Dhaka",
    shippingZip: "1213",
    shippingCountry: "BD",
    shippingMethodId: "123e4567-e89b-12d3-a456-426614174000",
    paymentMethod: "BKASH" as const,
  };

  const sampleDbCart = {
    id: "cart-uuid-1",
    userId: "user-mock-uuid",
    items: [
      {
        id: "item-1",
        quantity: 1,
        variant: {
          id: "var-1",
          sku: "VL-TEE-BLK-M",
          size: "M",
          color: "Black",
          sellingPrice: 1200,
          discountPrice: null,
          costPrice: 600,
          productId: "prod-1",
          product: {
            id: "prod-1",
            name: "VibeLock Premium Tee",
            status: "PUBLISHED",
          },
          inventoryTransactions: [{ quantity: 10 }],
          inventoryReservations: [],
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    createdOrders.length = 0;
    createdPayments.length = 0;

    mockSession = { user: { id: "user-mock-uuid", email: "customer@vibelock.com" } };

    mockCartData = {
      id: "cart-uuid-1",
      items: [
        {
          id: "item-1",
          variantId: "var-1",
          quantity: 1,
          availableQuantity: 10,
          productSlug: "vibelock-premium-tee",
          productName: "VibeLock Premium Tee",
          productImage: null,
          lineTotal: 1200,
          variant: {
            id: "var-1",
            sku: "VL-TEE-BLK-M",
            size: "M",
            color: "Black",
            sellingPrice: 1200,
            discountPrice: null,
            effectivePrice: 1200,
            available: true,
          },
        },
      ],
      totalQuantity: 1,
      subtotal: 1200,
    };

    mockPrisma.cart.findUnique.mockResolvedValue(sampleDbCart);
    mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });

    mockPrisma.order.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.checkoutIdempotencyKey) {
        return createdOrders.find((o) => o.checkoutIdempotencyKey === where.checkoutIdempotencyKey) || null;
      }
      if (where.orderNumber) {
        return createdOrders.find((o) => o.orderNumber === where.orderNumber) || null;
      }
      if (where.id) {
        return createdOrders.find((o) => o.id === where.id) || null;
      }
      return null;
    });

    mockPrisma.order.create.mockImplementation(async ({ data }: any) => {
      const order = {
        id: `order-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      createdOrders.push(order);
      return order;
    });

    mockPrisma.payment.create.mockImplementation(async ({ data }: any) => {
      const payment = {
        id: `payment-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      createdPayments.push(payment);
      return payment;
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("1. Server-Side Checkout Validation", () => {
    test("rejects order creation when bKash is disabled by admin", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValue(false);

      const result = await createOrderAction(
        validCheckoutPayload,
        "idempotency-bkash-disabled-check"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "bKash payment is currently unavailable. Please choose another payment method."
      );
      expect(mockIsPaymentMethodEnabled).toHaveBeenCalledWith("BKASH");
      expect(createdOrders.length).toBe(0);
    });

    test("never trusts client choice: rejects unapproved payment method enum values", async () => {
      const result = await createOrderAction(
        { ...validCheckoutPayload, paymentMethod: "NAGAD" as any },
        "idempotency-unapproved"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid checkout information");
      expect(createdOrders.length).toBe(0);
    });
  });

  describe("2. Payment Creation & Redirect Handling", () => {
    test("successfully creates order with paymentMethod: ONLINE and initiates bKash payment with redirectUrl", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValue(true);

      // Mock bKash token grant + payment create responses
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            statusCode: "0000",
            statusMessage: "Successful",
            id_token: "bkash-mock-id-token-xyz",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            statusCode: "0000",
            statusMessage: "Successful",
            paymentID: "TR0011_BKASH_PAYMENT_999",
            bkashURL: "https://sandbox.payment.bkash.com/redirect/TR0011_BKASH_PAYMENT_999",
            amount: "1260.00",
            currency: "BDT",
            merchantInvoiceNumber: "VL-20261013-XYZ",
          }),
        });

      const idempotencyKey = "idempotency-bkash-success-1";
      const result = await createOrderAction(validCheckoutPayload, idempotencyKey);

      expect(result.success).toBe(true);
      expect(result.orderNumber).toBeDefined();
      expect(result.redirectUrl).toBe(
        "https://sandbox.payment.bkash.com/redirect/TR0011_BKASH_PAYMENT_999"
      );

      // Verify Order persisted in database
      expect(createdOrders.length).toBe(1);
      const savedOrder = createdOrders[0];
      expect(savedOrder.orderNumber).toBe(result.orderNumber);
      // Prisma Order model maps to enum ONLINE (schema compatibility)
      expect(savedOrder.paymentMethod).toBe("ONLINE");
      expect(savedOrder.paymentStatus).toBe("PENDING");
      expect(savedOrder.status).toBe("PENDING");

      // Verify inventory reservation was created but NOT consumed immediately (unlike COD)
      expect(mockReserveInventory).toHaveBeenCalledWith(savedOrder.id, expect.anything());
      expect(mockConsumeReservation).not.toHaveBeenCalled();

      // Verify Payment record was created with gateway BKASH and INITIATED status
      expect(createdPayments.length).toBe(1);
      const savedPayment = createdPayments[0];
      expect(savedPayment.orderId).toBe(savedOrder.id);
      expect(savedPayment.gateway).toBe("BKASH");
      expect(savedPayment.status).toBe("INITIATED");
      expect(savedPayment.merchantReferenceId).toBe("TR0011_BKASH_PAYMENT_999");
    });

    test("handles gateway initiation failure safely without losing order reference", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValue(true);

      // Mock bKash token grant success, but create failure
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            statusCode: "0000",
            statusMessage: "Successful",
            id_token: "bkash-mock-id-token-xyz",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            statusCode: "2001",
            statusMessage: "Invalid Amount",
          }),
        });

      const idempotencyKey = "idempotency-bkash-fail-init";
      const result = await createOrderAction(validCheckoutPayload, idempotencyKey);

      expect(result.success).toBe(true);
      expect(result.orderNumber).toBeDefined();
      expect(result.redirectUrl).toBeUndefined();
      expect(result.error).toBe(
        "Payment initiation failed. You can retry from your orders page."
      );

      // Order was created, inventory reserved
      expect(createdOrders.length).toBe(1);
      expect(createdOrders[0].paymentStatus).toBe("PENDING");
      // No payment was created in INITIATED state since gateway returned error
      expect(createdPayments.length).toBe(0);
    });
  });

  describe("3. Idempotency & Duplicate Prevention", () => {
    test("submitting identical idempotencyKey returns existing order without creating duplicate records", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValue(true);

      const existingOrder = {
        id: "order-existing-1",
        orderNumber: "VL-20261013-EXISTING",
        checkoutIdempotencyKey: "idempotency-key-repeat",
        userId: "user-mock-uuid",
        total: 1260,
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
      };
      createdOrders.push(existingOrder);

      const result = await createOrderAction(
        validCheckoutPayload,
        "idempotency-key-repeat"
      );

      expect(result.success).toBe(true);
      expect(result.orderNumber).toBe("VL-20261013-EXISTING");
      expect(mockReserveInventory).not.toHaveBeenCalled();
      expect(createdPayments.length).toBe(0);
    });
  });

  describe("4. Preserves COD and SSLCOMMERZ Integration", () => {
    test("COD order consumes inventory immediately and completes without payment initiation", async () => {
      mockIsPaymentMethodEnabled.mockImplementation(async (code: string) => code === "COD");

      const result = await createOrderAction(
        { ...validCheckoutPayload, paymentMethod: "COD" },
        "idempotency-cod-test"
      );

      expect(result.success).toBe(true);
      expect(result.orderNumber).toBeDefined();
      expect(result.redirectUrl).toBeUndefined();

      expect(createdOrders.length).toBe(1);
      expect(createdOrders[0].paymentMethod).toBe("COD");
      expect(mockReserveInventory).toHaveBeenCalled();
      expect(mockConsumeReservation).toHaveBeenCalled();
      expect(createdPayments.length).toBe(0);
    });

    test("SSLCOMMERZ online order initiates SSLCommerz payment gateway", async () => {
      mockIsPaymentMethodEnabled.mockImplementation(async (code: string) => code === "ONLINE");

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          GatewayPageURL: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=pay",
        }),
      });

      const result = await createOrderAction(
        { ...validCheckoutPayload, paymentMethod: "ONLINE" },
        "idempotency-ssl-test"
      );

      expect(result.success).toBe(true);
      expect(result.orderNumber).toBeDefined();
      expect(result.redirectUrl).toBe(
        "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=pay"
      );

      expect(createdOrders.length).toBe(1);
      expect(createdOrders[0].paymentMethod).toBe("ONLINE");
      expect(mockConsumeReservation).not.toHaveBeenCalled();
      expect(createdPayments.length).toBe(1);
      expect(createdPayments[0].gateway).toBe("SSLCOMMERZ");
    });
  });

  describe("5. End-to-End Callback Verification & Settlement", () => {
    test("successful verified callback marks payment and order SUCCESS and consumes inventory", async () => {
      const order = {
        id: "order-settle-uuid",
        orderNumber: "VL-20261013-SETTLE",
        userId: "user-mock-uuid",
        total: 1260,
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        items: [
          {
            id: "item-1",
            sku: "VL-TEE-BLK-M",
            quantity: 1,
          },
        ],
      };

      const payment = {
        id: "payment-settle-uuid",
        orderId: order.id,
        amount: 1260,
        status: "INITIATED",
        gateway: "BKASH",
        merchantReferenceId: "TR0011_SETTLE_PAYMENT",
      };

      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.productVariant.findMany.mockResolvedValue([
        { id: "var-1", sku: "VL-TEE-BLK-M" },
      ]);
      mockPrisma.inventoryTransaction.findMany.mockResolvedValue([]);
      mockPrisma.inventoryReservation.findMany.mockResolvedValue([
        { id: "res-1", orderId: order.id, status: "RESERVED", expiresAt: new Date(Date.now() + 60000) },
      ]);
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

      // Mock executePayment response from bKash gateway
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            statusCode: "0000",
            statusMessage: "Successful",
            id_token: "bkash-id-token-exec",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            statusCode: "0000",
            statusMessage: "Successful",
            paymentID: "TR0011_SETTLE_PAYMENT",
            trxID: "BKASH_TRX_999888",
            transactionStatus: "Completed",
            amount: "1260.00",
            currency: "BDT",
            merchantInvoiceNumber: "VL-20261013-SETTLE",
          }),
        });

      const paymentService = new PaymentService();
      const result = await paymentService.verifyCallback("BKASH", {
        paymentID: "TR0011_SETTLE_PAYMENT",
        status: "success",
      });

      expect(result.orderNumber).toBe("VL-20261013-SETTLE");
      expect(result.verification.success).toBe(true);
      expect(result.verification.status).toBe("SUCCESS");
      expect(result.verification.providerTransactionId).toBe("BKASH_TRX_999888");

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SUCCESS",
            gatewayTransactionId: "BKASH_TRX_999888",
          }),
        })
      );
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: "SUCCESS",
          }),
        })
      );
      expect(mockConsumeReservation).toHaveBeenCalledWith(order.id, expect.anything());
    });
  });
});
