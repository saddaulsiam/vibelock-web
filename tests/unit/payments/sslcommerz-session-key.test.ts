/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { PaymentStatus } from "@prisma/client";

// Hoist mock env
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    SSLCOMMERZ_STORE_ID: "vibelock_ssl_store",
    SSLCOMMERZ_STORE_PASSWORD: "vibelock_ssl_passwd",
    SSLCOMMERZ_SANDBOX: true,
  },
}));

vi.mock("@/lib/config/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/config/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: "https://vibelock.bd",
  },
}));

// Mock Sentry
const { mockSentry } = vi.hoisted(() => ({
  mockSentry: {
    captureMessage: vi.fn(),
  },
}));

vi.mock("@sentry/nextjs", () => mockSentry);

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    order: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      create: vi.fn(),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    payment: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "pay-default-placeholder", status: "PENDING" })),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    productVariant: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(),
    },
    inventoryReservation: {
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    inventoryTransaction: {
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async () => ({ count: 1 })),
    },
    orderHistory: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(async (cb: any) => cb(mock)),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

// Mock inventory service
const { mockCancelOrderInventory, mockConsumeReservation } = vi.hoisted(() => ({
  mockCancelOrderInventory: vi.fn(async () => {}),
  mockConsumeReservation: vi.fn(async () => {}),
}));

vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    consumeReservation: mockConsumeReservation,
    cancelOrderInventory: mockCancelOrderInventory,
    calculateAvailableQuantity: vi.fn(() => 10),
  },
}));

// Mock coupon release
vi.mock("@/lib/coupons/service", () => ({
  CouponService: {
    releaseCoupon: vi.fn(async () => {}),
  },
}));

// Mock email
vi.mock("@/lib/email", () => ({
  sendOrderConfirmationEmail: vi.fn(async () => {}),
}));

import { SSLCommerzProvider } from "@/lib/payment/providers/sslcommerz/client";
import { PaymentService } from "@/lib/payment/service";

describe("SSLCommerz Session Key Persistence & Metadata Preservation", () => {
  let provider: SSLCommerzProvider;
  let paymentService: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    provider = new SSLCommerzProvider();
    paymentService = new PaymentService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. SSLCommerzProvider.initiatePayment sessionkey extraction
  // --------------------------------------------------------------------------
  describe("SSLCommerzProvider.initiatePayment", () => {
    it("captures sessionkey when SSLCommerz returns status SUCCESS", async () => {
      const mockApiResponse = {
        status: "SUCCESS",
        sessionkey: "F8B1A2C3D4E5F60718293A4B5C6D7E8F",
        GatewayPageURL: "https://sandbox.sslcommerz.com/EasyCheckOut/testcde123",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const response = await provider.initiatePayment({
        orderId: "ord-test-01",
        orderNumber: "VL-20261119-TEST01",
        amount: 1500,
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerPhone: "+8801700000000",
        shippingStreet: "123 Banani",
        shippingCity: "Dhaka",
        shippingZip: "1213",
        shippingCountry: "BD",
      });

      expect(response.success).toBe(true);
      expect(response.redirectUrl).toBe("https://sandbox.sslcommerz.com/EasyCheckOut/testcde123");
      expect(response.sessionKey).toBe("F8B1A2C3D4E5F60718293A4B5C6D7E8F");
      expect(response.merchantReferenceId).toMatch(/^SSLC-VL-20261119-TEST01-/);
    });

    it("trims whitespace from returned sessionkey", async () => {
      const mockApiResponse = {
        status: "SUCCESS",
        sessionkey: "   SESSION-WITH-WHITESPACE-123   ",
        GatewayPageURL: "https://sandbox.sslcommerz.com/EasyCheckOut/whitespace123",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const response = await provider.initiatePayment({
        orderId: "ord-test-02",
        orderNumber: "VL-20261119-TEST02",
        amount: 800,
        customerName: "Alice Smith",
        customerEmail: "alice@example.com",
        customerPhone: "+8801800000000",
        shippingStreet: "456 Gulshan",
        shippingCity: "Dhaka",
        shippingZip: "1212",
        shippingCountry: "BD",
      });

      expect(response.success).toBe(true);
      expect(response.sessionKey).toBe("SESSION-WITH-WHITESPACE-123");
    });

    it("does not return sessionKey when gateway status is FAILED", async () => {
      const mockApiResponse = {
        status: "FAILED",
        failedreason: "Invalid Store ID or Password",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const response = await provider.initiatePayment({
        orderId: "ord-test-03",
        orderNumber: "VL-20261119-TEST03",
        amount: 2500,
        customerName: "Bob Brown",
        customerEmail: "bob@example.com",
        customerPhone: "+8801900000000",
        shippingStreet: "789 Dhanmondi",
        shippingCity: "Dhaka",
        shippingZip: "1209",
        shippingCountry: "BD",
      });

      expect(response.success).toBe(false);
      expect(response.sessionKey).toBeUndefined();
      expect(response.error).toBe("Invalid Store ID or Password");
    });

    it("returns sessionKey: undefined when sessionkey is missing from SUCCESS response", async () => {
      const mockApiResponse = {
        status: "SUCCESS",
        // sessionkey omitted by gateway
        GatewayPageURL: "https://sandbox.sslcommerz.com/EasyCheckOut/no-session-123",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const response = await provider.initiatePayment({
        orderId: "ord-test-04",
        orderNumber: "VL-20261119-TEST04",
        amount: 500,
        customerName: "Charlie",
        customerEmail: "charlie@example.com",
        customerPhone: "+8801600000000",
        shippingStreet: "10 Mohakhali",
        shippingCity: "Dhaka",
        shippingZip: "1212",
        shippingCountry: "BD",
      });

      expect(response.success).toBe(true);
      expect(response.sessionKey).toBeUndefined();
      expect(response.redirectUrl).toBe("https://sandbox.sslcommerz.com/EasyCheckOut/no-session-123");
    });
  });

  // --------------------------------------------------------------------------
  // 2. PaymentService.initiatePayment persistence in Payment.gatewayPayload
  // --------------------------------------------------------------------------
  describe("PaymentService.initiatePayment persistence", () => {
    const testOrder: any = {
      id: "ord-persist-01",
      orderNumber: "VL-20261119-PERSIST01",
      total: 1050,
      paymentMethod: "SSLCOMMERZ",
      status: "PENDING",
      paymentStatus: "PENDING",
      shippingAddress: {
        street: "Road 11",
        city: "Dhaka",
        zip: "1213",
        country: "BD",
      },
      user: {
        name: "Test Customer",
        email: "customer@example.com",
        phone: "+8801711111111",
      },
    };

    it("persists sessionKey inside gatewayPayload.initiation on successful initiation", async () => {
      mockPrisma.payment.findFirst.mockResolvedValueOnce(null); // no active initiated payment
      mockPrisma.payment.create.mockResolvedValueOnce({
        id: "pay-placeholder-01",
        status: "PENDING",
      });
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "ord-persist-01",
        status: "PENDING",
        paymentStatus: "PENDING",
      });

      // Mock gateway response
      const mockApiResponse = {
        status: "SUCCESS",
        sessionkey: "TEST-SESSION-KEY-9999",
        GatewayPageURL: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=test",
      };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await paymentService.initiatePayment(testOrder, "SSLCOMMERZ");

      expect(result.success).toBe(true);
      expect(result.redirectUrl).toBe("https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=test");
      expect(result.sessionKey).toBe("TEST-SESSION-KEY-9999");

      // Verify that tx.payment.update was called with namespaced initiation metadata
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-placeholder-01" },
          data: expect.objectContaining({
            status: "INITIATED",
            gatewayPayload: expect.objectContaining({
              initiation: expect.objectContaining({
                sessionKey: "TEST-SESSION-KEY-9999",
                redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=test",
                initiatedAt: expect.any(String),
              }),
              redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=test", // root backward compat
            }),
          }),
        })
      );
    });

    it("does not persist sessionKey when gateway initiation fails", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "ord-persist-01",
        status: "PENDING",
        paymentStatus: "PENDING",
      });
      mockPrisma.payment.findFirst.mockResolvedValueOnce(null);
      mockPrisma.payment.create.mockResolvedValueOnce({
        id: "pay-placeholder-02",
        status: "PENDING",
      });

      const mockApiResponse = {
        status: "FAILED",
        failedreason: "Store credentials invalid",
      };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await paymentService.initiatePayment(testOrder, "SSLCOMMERZ");

      expect(result.success).toBe(false);
      expect(result.sessionKey).toBeUndefined();

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-placeholder-02" },
          data: expect.objectContaining({
            status: "FAILED",
            gatewayPayload: {
              error: "Store credentials invalid",
            },
          }),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. PaymentService.verifyCallback non-destructive metadata preservation
  // --------------------------------------------------------------------------
  describe("PaymentService.verifyCallback metadata preservation", () => {
    const existingInitiatedPayment: any = {
      id: "pay-session-cb-01",
      orderId: "ord-session-cb-01",
      merchantReferenceId: "SSLC-VL-20261119-SESS01",
      amount: 1050.0,
      gateway: "SSLCOMMERZ",
      status: PaymentStatus.INITIATED,
      gatewayPayload: {
        initiation: {
          sessionKey: "TRUSTED-SESSION-KEY-12345",
          redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=sess",
          initiatedAt: "2026-11-19T10:00:00.000Z",
        },
        redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=sess",
      },
    };

    const orderRecord: any = {
      id: "ord-session-cb-01",
      orderNumber: "VL-20261119-SESS01",
      total: 1050.0,
      paymentMethod: "SSLCOMMERZ",
      status: "PENDING",
      paymentStatus: "PENDING",
      items: [
        {
          id: "item-1",
          orderId: "ord-session-cb-01",
          variantId: "var-1",
          quantity: 1,
          price: 1050,
        },
      ],
    };

    it("preserves initiation.sessionKey and isolates callback fields under callback namespace", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(existingInitiatedPayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(orderRecord) // tx row-lock query
        .mockResolvedValueOnce(orderRecord); // final order lookup
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          providerTransactionId: "BANK-TRAN-SESS-99",
          verifiedMerchantReferenceId: "SSLC-VL-20261119-SESS01",
          verifiedAmount: 1050.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          rawPayload: {
            tran_id: "SSLC-VL-20261119-SESS01",
            val_id: "VAL-ID-SESS-99",
            amount: "1050.00",
            card_type: "VISA-Classic",
            bank_tran_id: "BANK-TRAN-SESS-99",
            status: "VALID",
          },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-VL-20261119-SESS01",
        val_id: "VAL-ID-SESS-99",
      });

      // Verify payment.updateMany payload
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "pay-session-cb-01" }),
          data: expect.objectContaining({
            status: "SUCCESS",
            gatewayTransactionId: "BANK-TRAN-SESS-99",
            gatewayPayload: expect.objectContaining({
              // 1. initiation namespace preserved intact!
              initiation: {
                sessionKey: "TRUSTED-SESSION-KEY-12345",
                redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=sess",
                initiatedAt: "2026-11-19T10:00:00.000Z",
              },
              // 2. callback namespace populated with sanitized callback attributes!
              callback: expect.objectContaining({
                tran_id: "SSLC-VL-20261119-SESS01",
                val_id: "VAL-ID-SESS-99",
                amount: "1050.00",
                card_type: "VISA-Classic",
                bank_tran_id: "BANK-TRAN-SESS-99",
                status: "VALID",
              }),
              // 3. backward-compatible root properties preserved
              redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=sess",
              card_type: "VISA-Classic",
            }),
          }),
        })
      );
    });

    it("prevents untrusted callback from overwriting initiation metadata", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(existingInitiatedPayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(orderRecord)
        .mockResolvedValueOnce(orderRecord);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      // Malicious callback containing spoofed initiation object
      const maliciousPayload = {
        tran_id: "SSLC-VL-20261119-SESS01",
        val_id: "VAL-ID-SPOOF",
        amount: "1050.00",
        card_type: "BKASH-bKash",
        status: "VALID",
        initiation: {
          sessionKey: "MALICIOUS-INJECTED-KEY",
          redirectUrl: "https://evil.example.com",
        },
      };

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          providerTransactionId: "BANK-SPOOF-01",
          verifiedMerchantReferenceId: "SSLC-VL-20261119-SESS01",
          verifiedAmount: 1050.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          rawPayload: maliciousPayload,
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-VL-20261119-SESS01",
        val_id: "VAL-ID-SPOOF",
      });

      const updateCall = mockPrisma.payment.updateMany.mock.calls[0][0];
      const savedPayload = updateCall.data.gatewayPayload;

      // The trusted sessionKey MUST remain untouched
      expect(savedPayload.initiation.sessionKey).toBe("TRUSTED-SESSION-KEY-12345");
      expect(savedPayload.initiation.sessionKey).not.toBe("MALICIOUS-INJECTED-KEY");
      expect(savedPayload.initiation.redirectUrl).toBe(
        "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=sess"
      );
      // Callback namespace must NOT have the malicious initiation object
      expect(savedPayload.callback.initiation).toBeUndefined();
    });

    it("strips store passwords, store IDs, and sensitive tokens from persisted callback", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(existingInitiatedPayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(orderRecord)
        .mockResolvedValueOnce(orderRecord);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      const payloadWithSensitiveData = {
        tran_id: "SSLC-VL-20261119-SESS01",
        val_id: "VAL-ID-CREDS-01",
        amount: "1050.00",
        card_type: "NAGAD-Nagad",
        status: "VALID",
        store_id: "secret_store_id_123",
        store_passwd: "super_secret_store_password_456",
        password: "secret_password",
        app_secret: "secret_app_secret",
        app_key: "secret_app_key",
        id_token: "secret_id_token",
        token: "secret_bearer_token",
        refreshToken: "secret_refresh_token",
        sensitiveData: "confidential_gateway_data",
        signature: "hash_hmac_secret",
        merchantPrivateKey: "-----BEGIN PRIVATE KEY-----",
        pgPublicKey: "-----BEGIN PUBLIC KEY-----",
      };

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          providerTransactionId: "BANK-CREDS-01",
          verifiedMerchantReferenceId: "SSLC-VL-20261119-SESS01",
          verifiedAmount: 1050.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          rawPayload: payloadWithSensitiveData,
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-VL-20261119-SESS01",
        val_id: "VAL-ID-CREDS-01",
      });

      const updateCall = mockPrisma.payment.updateMany.mock.calls[0][0];
      const savedPayload = updateCall.data.gatewayPayload;

      // Verify that none of the forbidden credentials are saved anywhere in gatewayPayload
      expect(savedPayload.store_id).toBeUndefined();
      expect(savedPayload.store_passwd).toBeUndefined();
      expect(savedPayload.password).toBeUndefined();
      expect(savedPayload.app_secret).toBeUndefined();
      expect(savedPayload.app_key).toBeUndefined();
      expect(savedPayload.id_token).toBeUndefined();
      expect(savedPayload.token).toBeUndefined();
      expect(savedPayload.refreshToken).toBeUndefined();
      expect(savedPayload.sensitiveData).toBeUndefined();
      expect(savedPayload.signature).toBeUndefined();
      expect(savedPayload.merchantPrivateKey).toBeUndefined();
      expect(savedPayload.pgPublicKey).toBeUndefined();

      expect(savedPayload.callback.store_id).toBeUndefined();
      expect(savedPayload.callback.store_passwd).toBeUndefined();
      expect(savedPayload.callback.password).toBeUndefined();
      expect(savedPayload.callback.app_secret).toBeUndefined();
      expect(savedPayload.callback.app_key).toBeUndefined();

      // Only safe allowlisted keys are retained in callback
      expect(savedPayload.callback.card_type).toBe("NAGAD-Nagad");
      expect(savedPayload.callback.status).toBe("VALID");
    });

    it("preserves initiation.sessionKey in amount mismatch failure path", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(existingInitiatedPayment);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          providerTransactionId: "BANK-MISMATCH-01",
          verifiedMerchantReferenceId: "SSLC-VL-20261119-SESS01",
          verifiedAmount: 50.0, // Order is 1050, verified is 50 -> Mismatch!
          verifiedCurrency: "BDT",
          isUnverified: false,
          rawPayload: {
            tran_id: "SSLC-VL-20261119-SESS01",
            val_id: "VAL-TAMPER-01",
            amount: "50.00",
            status: "VALID",
          },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await expect(
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: "SSLC-VL-20261119-SESS01",
          val_id: "VAL-TAMPER-01",
        })
      ).rejects.toThrow("Payment verification failed: Amount Mismatch");

      // Verify that payment status was marked FAILED, but initiation metadata was preserved
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-session-cb-01", status: { not: "SUCCESS" } },
          data: expect.objectContaining({
            status: "FAILED",
            gatewayPayload: expect.objectContaining({
              initiation: {
                sessionKey: "TRUSTED-SESSION-KEY-12345",
                redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=sess",
                initiatedAt: "2026-11-19T10:00:00.000Z",
              },
              callback: expect.objectContaining({
                tran_id: "SSLC-VL-20261119-SESS01",
                amount: "50.00",
                status: "VALID",
              }),
            }),
          }),
        })
      );
    });

    it("lifts legacy redirectUrl into initiation namespace when processing legacy records", async () => {
      const legacyPaymentRecord: any = {
        id: "pay-legacy-01",
        orderId: "ord-legacy-01",
        merchantReferenceId: "SSLC-VL-LEGACY-01",
        amount: 1050.0,
        gateway: "SSLCOMMERZ",
        status: PaymentStatus.INITIATED,
        // Legacy record without initiation namespace
        gatewayPayload: {
          redirectUrl: "https://sandbox.sslcommerz.com/legacy/redirect",
        },
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(legacyPaymentRecord);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(orderRecord)
        .mockResolvedValueOnce(orderRecord);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          providerTransactionId: "BANK-LEGACY-01",
          verifiedMerchantReferenceId: "SSLC-VL-LEGACY-01",
          verifiedAmount: 1050.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          rawPayload: {
            tran_id: "SSLC-VL-LEGACY-01",
            val_id: "VAL-LEGACY-01",
            amount: "1050.00",
            status: "VALID",
          },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-VL-LEGACY-01",
        val_id: "VAL-LEGACY-01",
      });

      const updateCall = mockPrisma.payment.updateMany.mock.calls[0][0];
      const savedPayload = updateCall.data.gatewayPayload;

      // Legacy redirectUrl lifted into initiation namespace safely
      expect(savedPayload.initiation).toEqual({
        redirectUrl: "https://sandbox.sslcommerz.com/legacy/redirect",
      });
      expect(savedPayload.redirectUrl).toBe("https://sandbox.sslcommerz.com/legacy/redirect");
    });

    it("preserves initiation.sessionKey across repeated callbacks (FAILED followed by late SUCCESS)", async () => {
      // Step 1: Payment was previously marked FAILED by first callback, but initiation was preserved
      const failedPaymentRecord: any = {
        id: "pay-repeated-01",
        orderId: "ord-session-cb-01",
        merchantReferenceId: "SSLC-VL-20261119-RECOVERY",
        amount: 1050.0,
        gateway: "SSLCOMMERZ",
        status: PaymentStatus.FAILED,
        gatewayPayload: {
          initiation: {
            sessionKey: "PERSISTENT-RECOVERY-KEY-777",
            redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=rec",
            initiatedAt: "2026-11-19T11:00:00.000Z",
          },
          callback: {
            tran_id: "SSLC-VL-20261119-RECOVERY",
            status: "FAILED",
            failedreason: "Temporary network timeout",
          },
          redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=rec",
        },
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(failedPaymentRecord);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(orderRecord)
        .mockResolvedValueOnce(orderRecord);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          providerTransactionId: "BANK-RECOVERY-999",
          verifiedMerchantReferenceId: "SSLC-VL-20261119-RECOVERY",
          verifiedAmount: 1050.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          rawPayload: {
            tran_id: "SSLC-VL-20261119-RECOVERY",
            val_id: "VAL-RECOVERY-999",
            amount: "1050.00",
            card_type: "BKASH-bKash",
            status: "VALID",
          },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      // Late SUCCESS recovery callback arrives
      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-VL-20261119-RECOVERY",
        val_id: "VAL-RECOVERY-999",
      });

      const updateCall = mockPrisma.payment.updateMany.mock.calls[0][0];
      const savedPayload = updateCall.data.gatewayPayload;

      // The original sessionKey is preserved intact through the late SUCCESS recovery!
      expect(savedPayload.initiation.sessionKey).toBe("PERSISTENT-RECOVERY-KEY-777");
      expect(savedPayload.initiation.redirectUrl).toBe(
        "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=rec"
      );
      // Callback namespace updated to successful transaction
      expect(savedPayload.callback.status).toBe("VALID");
      expect(savedPayload.callback.card_type).toBe("BKASH-bKash");
      expect(savedPayload.card_type).toBe("BKASH-bKash");
    });

    it("ensures sessionKey is never exposed to public/client order DTO mappers", async () => {
      const { mapOrderSummary, mapOrderDetail } = await import("@/lib/orders/mappers");

      const paymentWithSessionKey: any = {
        id: "pay-dto-01",
        gateway: "SSLCOMMERZ",
        status: "SUCCESS",
        amount: 1050,
        createdAt: new Date(),
        gatewayPayload: {
          initiation: {
            sessionKey: "TOP-SECRET-SESSION-KEY-XYZ",
            redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/secret",
            initiatedAt: "2026-11-19T10:00:00.000Z",
          },
          callback: {
            card_type: "VISA-Classic",
            status: "VALID",
          },
          card_type: "VISA-Classic",
          redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/secret",
        },
      };

      const fullOrder: any = {
        id: "ord-dto-01",
        orderNumber: "VL-20261119-DTO01",
        userId: "user-1",
        total: 1050,
        status: "PROCESSING",
        paymentStatus: "SUCCESS",
        paymentMethod: "SSLCOMMERZ",
        subtotal: 1000,
        shippingFee: 50,
        discount: 0,
        couponCode: null,
        notes: null,
        cancelReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        payments: [paymentWithSessionKey],
        shippingAddress: {
          name: "Test User",
          phone: "01700000000",
          street: "Road 1",
          city: "Dhaka",
          zip: "1212",
          country: "Bangladesh",
        },
      };

      const summaryDto = mapOrderSummary(fullOrder);
      const detailDto = mapOrderDetail(fullOrder);

      // JSON stringify representations must never contain sessionKey
      const summaryJson = JSON.stringify(summaryDto);
      const detailJson = JSON.stringify(detailDto);

      expect(summaryJson).not.toContain("TOP-SECRET-SESSION-KEY-XYZ");
      expect(summaryJson).not.toContain("sessionKey");
      expect(summaryJson).not.toContain("sessionkey");

      expect(detailJson).not.toContain("TOP-SECRET-SESSION-KEY-XYZ");
      expect(detailJson).not.toContain("sessionKey");
      expect(detailJson).not.toContain("sessionkey");
    });
  });
});
