/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";

const testMerchantKeys = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const testNagadKeys = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    SSLCOMMERZ_STORE_ID: "vibelock_ssl_store",
    SSLCOMMERZ_STORE_PASSWORD: "vibelock_ssl_passwd",
    SSLCOMMERZ_SANDBOX: true,
    NAGAD_MERCHANT_ID: "68300000025",
    NAGAD_MERCHANT_NUMBER: "01711111111",
    NAGAD_PG_PUBLIC_KEY: "",
    NAGAD_MERCHANT_PRIVATE_KEY: "",
    NAGAD_SANDBOX: true,
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

const mockSession: unknown = { user: { id: "user-mock-uuid", email: "customer@vibelock.com" } };

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

const mockPaymentServiceInitiate = vi.fn();

vi.mock("@/lib/payment/service", () => {
  return {
    PaymentService: class {
      initiatePayment = mockPaymentServiceInitiate;
    },
  };
});

import { createOrderAction } from "@/lib/checkout/actions";
import { isNagadCredentialConfigured } from "@/lib/settings/payment-settings";

describe("Nagad Checkout & Payment Settings Integration", () => {
  const validCheckoutPayload = {
    customerName: "Siam Nagad",
    customerEmail: "siam@vibelock.com",
    customerPhone: "01811111111",
    shippingStreet: "Banani 11",
    shippingCity: "Dhaka",
    shippingCountry: "BD",
    shippingMethodId: "123e4567-e89b-12d3-a456-426614174000",
    paymentMethod: "NAGAD" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    createdOrders.length = 0;
    createdPayments.length = 0;

    mockEnv.NAGAD_MERCHANT_ID = "68300000025";
    mockEnv.NAGAD_MERCHANT_NUMBER = "01711111111";
    mockEnv.NAGAD_PG_PUBLIC_KEY = testNagadKeys.publicKey;
    mockEnv.NAGAD_MERCHANT_PRIVATE_KEY = testMerchantKeys.privateKey;

    mockCartData = {
      id: "cart-mock-1",
      items: [
        {
          id: "item-1",
          variantId: "variant-1",
          quantity: 2,
          availableQuantity: 10,
          price: 1000,
          variant: {
            id: "variant-1",
            available: true,
            sku: "SKU-NAGAD-01",
            product: { name: "VibeLock Smart Hoodie" },
          },
        },
      ],
    };

    const sampleDbCart = {
      id: "cart-mock-1",
      userId: "user-mock-uuid",
      items: [
        {
          id: "item-1",
          quantity: 2,
          variant: {
            id: "variant-1",
            sku: "SKU-NAGAD-01",
            size: "L",
            color: "Black",
            sellingPrice: 1000,
            discountPrice: null,
            costPrice: 500,
            productId: "prod-1",
            product: {
              id: "prod-1",
              name: "VibeLock Smart Hoodie",
              status: "PUBLISHED",
            },
            inventoryTransactions: [{ quantity: 10 }],
            inventoryReservations: [],
          },
        },
      ],
    };

    mockPrisma.cart.findUnique.mockResolvedValue(sampleDbCart);
    mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });

    mockPrisma.order.findUnique.mockImplementation(async ({ where }: any) => {
      if (where?.checkoutIdempotencyKey) {
        return createdOrders.find((o) => o.checkoutIdempotencyKey === where.checkoutIdempotencyKey) || null;
      }
      if (where?.orderNumber) {
        return createdOrders.find((o) => o.orderNumber === where.orderNumber) || createdOrders[0] || null;
      }
      if (where?.id) {
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
        items: data.items?.create || [],
      };
      createdOrders.push(order);
      return order;
    });

    mockPrisma.payment.create.mockImplementation(async ({ data }: any) => {
      const pay = { id: `pay-${Date.now()}`, ...data };
      createdPayments.push(pay);
      return pay;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Credential Readiness Checks", () => {
    test("isNagadCredentialConfigured returns true when all 4 credentials are set with valid 2048-bit RSA keys", () => {
      expect(isNagadCredentialConfigured()).toBe(true);
    });

    test("isNagadCredentialConfigured returns false when any credential is blank", () => {
      mockEnv.NAGAD_MERCHANT_ID = "   ";
      expect(isNagadCredentialConfigured()).toBe(false);

      mockEnv.NAGAD_MERCHANT_ID = "68300000025";
      mockEnv.NAGAD_MERCHANT_PRIVATE_KEY = "";
      expect(isNagadCredentialConfigured()).toBe(false);
    });

    test("isNagadCredentialConfigured returns false when merchant private key is truncated or malformed", () => {
      mockEnv.NAGAD_MERCHANT_PRIVATE_KEY = "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7V9K07eS";
      expect(isNagadCredentialConfigured()).toBe(false);

      mockEnv.NAGAD_MERCHANT_PRIVATE_KEY = "not-a-valid-key-at-all";
      expect(isNagadCredentialConfigured()).toBe(false);
    });

    test("isNagadCredentialConfigured returns false when PG public key is truncated or malformed", () => {
      mockEnv.NAGAD_PG_PUBLIC_KEY = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy9fzj";
      expect(isNagadCredentialConfigured()).toBe(false);

      mockEnv.NAGAD_PG_PUBLIC_KEY = "malformed-public-key-string";
      expect(isNagadCredentialConfigured()).toBe(false);
    });

    test("isNagadCredentialConfigured returns false when RSA key has non-2048 modulus", () => {
      const keys1024 = crypto.generateKeyPairSync("rsa", {
        modulusLength: 1024,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

      mockEnv.NAGAD_PG_PUBLIC_KEY = keys1024.publicKey;
      expect(isNagadCredentialConfigured()).toBe(false);

      mockEnv.NAGAD_PG_PUBLIC_KEY = testNagadKeys.publicKey;
      mockEnv.NAGAD_MERCHANT_PRIVATE_KEY = keys1024.privateKey;
      expect(isNagadCredentialConfigured()).toBe(false);
    });
  });

  describe("2. Checkout Availability Enforcement", () => {
    test("rejects checkout when Nagad is disabled by admin", async () => {
      mockIsPaymentMethodEnabled.mockImplementation(async (code: string) => {
        if (code === "NAGAD") return false;
        return true;
      });

      const res = await createOrderAction(validCheckoutPayload as any, "idemp-nagad-test-1");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Nagad payment is currently unavailable. Please choose another payment method.");
      expect(mockPaymentServiceInitiate).not.toHaveBeenCalled();
    });

    test("proceeds to initiation when Nagad is enabled by admin", async () => {
      mockIsPaymentMethodEnabled.mockImplementation(async (code: string) => {
        if (code === "NAGAD") return true;
        return false;
      });

      mockPaymentServiceInitiate.mockResolvedValueOnce({
        success: true,
        redirectUrl: "https://api-sandbox.mynagad.com/remote-payment-gateway-1.0/index.php?paymentrefid=PRID_123",
        merchantReferenceId: "PRID_123",
      });

      const res = await createOrderAction(validCheckoutPayload as any, "idemp-nagad-test-2");
      expect(res.success).toBe(true);
      expect(res.redirectUrl).toContain("remote-payment-gateway-1.0");
      expect(mockPaymentServiceInitiate).toHaveBeenCalledWith(
        expect.anything(),
        "NAGAD"
      );

      // Verify that database Order.paymentMethod mapped to ONLINE
      expect(createdOrders[0].paymentMethod).toBe("ONLINE");
    });

    test("handles gateway initiation failure gracefully without throwing unhandled error", async () => {
      mockIsPaymentMethodEnabled.mockResolvedValue(true);

      mockPaymentServiceInitiate.mockResolvedValueOnce({
        success: false,
        error: "Gateway timeout connecting to Nagad",
      });

      const res = await createOrderAction(validCheckoutPayload as any, "idemp-nagad-test-3");
      expect(res.success).toBe(true);
      expect(res.error).toContain("Payment initiation failed. You can retry from your orders page.");
    });
  });
});
