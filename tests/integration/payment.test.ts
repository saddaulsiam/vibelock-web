import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "../../src/lib/prisma/client";
import { createTestProduct, createTestVariant, createTestInventory } from "../factories";
import { createTestUser } from "../factories/user";
import { addToCart } from "../../src/lib/cart/mutations";
import { createOrderAction } from "../../src/lib/checkout/actions";
import { PaymentService } from "../../src/lib/payment/service";
import { SSLCommerzProvider } from "../../src/lib/payment/providers/sslcommerz/client";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { getCustomerOrder } from "../../src/lib/orders/queries";
import { cancelOrderAction } from "../../src/lib/orders/actions";
import { POST as paymentCallback } from "../../src/app/api/payments/sslcommerz/callback/route";
import { NextRequest } from "next/server";

const mockCookies = new Map();
let mockSession: unknown = null;

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string, value: string, options: unknown) => mockCookies.set(key, { value, options }),
    delete: (key: string) => mockCookies.delete(key),
  })),
}));

vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

// Mock shipping pricing
vi.mock("../../src/lib/shipping/pricing", () => ({
  calculateShippingCharge: vi.fn(() => 50),
}));

vi.mock("../../src/lib/config/env", () => ({
  env: {
    SSLCOMMERZ_STORE_ID: "test_store",
    SSLCOMMERZ_STORE_PASSWORD: "test_password",
    SSLCOMMERZ_SANDBOX: true,
    INVENTORY_RESERVATION_TTL_SECONDS: 600,
  },
}));

// Mock fetch for SSLCommerz
const originalFetch = global.fetch;

describe("Phase 3G - Payments & SSLCommerz", () => {
  beforeEach(() => {
    mockCookies.clear();
    mockSession = null;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const validCheckoutData = {
    customerName: "Test User",
    customerEmail: "test@example.com",
    customerPhone: "01711111111",
    shippingStreet: "123 Main St",
    shippingCity: "Dhaka",
    shippingState: "Dhaka",
    shippingZip: "1200",
    shippingCountry: "BD",
    paymentMethod: "ONLINE" as const,
  };

  test("6.1 Online checkout creates/uses correct payment state & 7.1 Successful initialization", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    // Mock SSLCommerz init
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });

    const idempotencyKey = crypto.randomUUID();
    const res = await createOrderAction(validCheckoutData, idempotencyKey);

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("https://sandbox.sslcommerz.com/pay");
    expect(res.orderNumber).toBeDefined();

    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    expect(payment).toBeDefined();
    expect(payment?.status).toBe("INITIATED");
    expect(payment?.amount.toNumber()).toBe(150); // 100 + 50 shipping
    expect(payment?.gateway).toBe("SSLCOMMERZ");
    expect(payment?.merchantReferenceId).toContain("SSLC-");
  });

  test("7.2 Provider rejection", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({ status: "FAILED", failedreason: "Invalid credentials" }),
    });

    const idempotencyKey = crypto.randomUUID();
    const res = await createOrderAction(validCheckoutData, idempotencyKey);

    expect(res.success).toBe(true);
    expect(res.error).toContain("Payment initiation failed");
    expect(res.error).not.toContain("Network Error");
    expect(res.error).not.toContain("DATABASE_URL");

    // Order should remain PENDING but with error returned
    const order = await prisma.order.findFirst({
      where: { checkoutIdempotencyKey: idempotencyKey },
    });
    expect(order?.status).toBe("PENDING");

    // Payment should not be created if initiation failed
    const payment = await prisma.payment.findFirst({ where: { orderId: order?.id } });
    expect(payment).toBeNull();
  });

  test("7.3 Provider timeout/network failure", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    const providerErrorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    (global.fetch as import("vitest").Mock).mockRejectedValueOnce(
      new Error("Network Error store_password=private-marker")
    );

    const idempotencyKey = crypto.randomUUID();
    const res = await createOrderAction(validCheckoutData, idempotencyKey);

    expect(res.success).toBe(true);
    expect(res.error).toContain("Payment initiation failed");
    expect(JSON.stringify(providerErrorLog.mock.calls)).not.toContain("private-marker");

    // Order should remain PENDING
    const order = await prisma.order.findFirst({
      where: { checkoutIdempotencyKey: idempotencyKey },
    });
    expect(order?.status).toBe("PENDING");
  });

  test("8. Success callback & 17. Inventory reservation interaction", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    // Init
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(res.success).toBe(true);

    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });
    expect(payment?.status).toBe("INITIATED");

    // Reservation should exist
    const initialReservations = await prisma.inventoryReservation.findMany({
      where: { variantId: variant.id },
    });
    expect(initialReservations.length).toBeGreaterThan(0);

    // Validation API callback
    const bankTranId = crypto.randomUUID();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: bankTranId,
        tran_id: payment?.merchantReferenceId,
        currency: "BDT",
      }),
    });

    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment?.merchantReferenceId,
      val_id: "VAL123",
    });

    // Check payment & order state
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("SUCCESS");
    expect(updatedPayment?.gatewayTransactionId).toBe(bankTranId);

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).toBe("SUCCESS");

    // Reservation should be consumed (marked COMMITTED or deleted)
    const finalReservations = await prisma.inventoryReservation.findMany({
      where: { variantId: variant.id, status: "RESERVED" },
    });
    expect(finalReservations.length).toBe(0);

    const inventoryTx = await prisma.inventoryTransaction.findMany({
      where: { variantId: variant.id, type: "SALE", referenceId: payment!.orderId },
    });
    expect(inventoryTx.length).toBe(1); // exactly once
  });

  test("10. Amount Mismatch", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());

    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "1.00", // Wrong amount
        bank_tran_id: crypto.randomUUID(),
        tran_id: payment?.merchantReferenceId,
        currency: "BDT",
      }),
    });

    const paymentService = new PaymentService();
    await expect(
      paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: payment?.merchantReferenceId,
        val_id: "VAL123",
      })
    ).rejects.toThrow("Amount Mismatch");

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("FAILED"); // Handled safely

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).not.toBe("SUCCESS");

    // Inventory should NOT be committed
    const inventoryTx = await prisma.inventoryTransaction.findMany({
      where: { variantId: variant.id, type: "SALE", referenceId: payment!.orderId },
    });
    expect(inventoryTx.length).toBe(0);
  });

  test("10.1 Currency and provider-reference mismatches are rejected", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const product = await createTestProduct();
    const variant = await createTestVariant({ productId: product.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const checkout = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: checkout.orderNumber as string } },
    });
    expect(payment).not.toBeNull();

    const paymentService = new PaymentService();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        currency: "USD",
        tran_id: payment!.merchantReferenceId,
        bank_tran_id: crypto.randomUUID(),
      }),
    });
    await expect(
      paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: payment!.merchantReferenceId,
        val_id: "VAL-CURRENCY",
      })
    ).rejects.toThrow("Currency Mismatch");

    const afterCurrencyMismatch = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(afterCurrencyMismatch?.status).toBe("INITIATED");

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        currency: "BDT",
        tran_id: "DIFFERENT-TRANSACTION",
        bank_tran_id: crypto.randomUUID(),
      }),
    });
    await expect(
      paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: payment!.merchantReferenceId,
        val_id: "VAL-MAPPING",
      })
    ).rejects.toThrow("Transaction or Currency Mismatch");

    const afterMappingMismatch = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(afterMappingMismatch?.status).toBe("INITIATED");
    const activeReservations = await prisma.inventoryReservation.count({
      where: { orderId: payment!.orderId, status: "RESERVED" },
    });
    expect(activeReservations).toBe(1);
  });

  test("11. Invalid / Unknown Transaction", async () => {
    const paymentService = new PaymentService();

    // Missing tran_id
    await expect(paymentService.verifyCallback("SSLCOMMERZ", { val_id: "VAL123" })).rejects.toThrow(
      "Missing transaction reference"
    );

    // Unknown tran_id
    await expect(
      paymentService.verifyCallback("SSLCOMMERZ", { tran_id: "UNKNOWN", val_id: "VAL123" })
    ).rejects.toThrow("Payment record not found");
  });

  test("12. FAILED callback", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({ status: "INVALID_TRANSACTION" }),
    });
    const paymentService = new PaymentService();
    await expect(
      paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: payment?.merchantReferenceId,
        status: "FAILED",
        val_id: "VAL123",
      })
    ).rejects.toThrow("Payment verification failed");

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("INITIATED");

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).toBe("PENDING");

    const finalReservations = await prisma.inventoryReservation.findMany({
      where: { variantId: variant.id, status: "RESERVED" },
    });
    expect(finalReservations.length).toBe(1);
  });

  test("13. CANCELLED callback", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    const paymentService = new PaymentService();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({ status: "INVALID_TRANSACTION" }),
    });
    await expect(
      paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: payment?.merchantReferenceId,
        status: "CANCELLED",
        val_id: "VAL123",
      })
    ).rejects.toThrow("Payment verification failed");

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("INITIATED");
  });

  test("14. Duplicate callback / Idempotency & 21. Concurrency", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    // First Validation API fetch
    const bankTranId = crypto.randomUUID();
    (global.fetch as import("vitest").Mock).mockResolvedValue({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: bankTranId,
        tran_id: payment?.merchantReferenceId,
        currency: "BDT",
      }),
    });

    const paymentService = new PaymentService();

    // Run concurrently
    await Promise.all([
      paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: payment?.merchantReferenceId,
        val_id: "VAL123",
      }),
      paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: payment?.merchantReferenceId,
        val_id: "VAL123",
      }),
      paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: payment?.merchantReferenceId,
        val_id: "VAL123",
      }), // Should be skipped locally in method if atomic
    ]);

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("SUCCESS");

    const inventoryTx = await prisma.inventoryTransaction.findMany({
      where: { variantId: variant.id, type: "SALE", referenceId: payment!.orderId },
    });
    expect(inventoryTx.length).toBe(1); // exactly once!
  });

  test("15. Late Callback Protection", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: crypto.randomUUID(),
        tran_id: payment?.merchantReferenceId,
        currency: "BDT",
      }),
    });
    const paymentService = new PaymentService();

    // 1. Success
    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment?.merchantReferenceId,
      val_id: "VAL123",
    });

    // 2. Late Failed
    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment?.merchantReferenceId,
      status: "FAILED",
    });

    // 3. Late Cancelled
    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment?.merchantReferenceId,
      status: "CANCELLED",
    });

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("SUCCESS"); // Downgrade prevented

    const inventoryTx = await prisma.inventoryTransaction.findMany({
      where: { variantId: variant.id, type: "SALE", referenceId: payment!.orderId },
    });
    expect(inventoryTx.length).toBe(1); // Remains 1, no reversal
  });

  test("19. Sensitive data leakage", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: crypto.randomUUID(),
        tran_id: payment?.merchantReferenceId,
        currency: "BDT",
        store_passwd: "SUPER_SECRET_PASSWORD",
        store_id: "MY_STORE_ID",
      }),
    });

    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment?.merchantReferenceId,
      val_id: "VAL123",
    });

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.gatewayPayload).toBeDefined();

    const payload = updatedPayment?.gatewayPayload as Record<string, unknown>;
    expect(payload.store_passwd).toBeUndefined();
    expect(payload.store_id).toBeUndefined();
    expect(payload.status).toBe("VALID");
  });

  test("Customer order access is owner-scoped while provider callbacks use trusted references", async () => {
    const owner = await createTestUser();
    mockSession = { user: { id: owner.id } };
    const product = await createTestProduct();
    const variant = await createTestVariant({ productId: product.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const checkout = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(checkout.success).toBe(true);

    const order = await prisma.order.findUnique({
      where: { orderNumber: checkout.orderNumber as string },
      include: { payments: true },
    });
    expect(order).not.toBeNull();
    expect(order!.payments).toHaveLength(1);
    const payment = order!.payments[0];

    const otherUser = await createTestUser();
    mockSession = { user: { id: otherUser.id } };

    const orderDetails = await getCustomerOrder(order!.orderNumber);
    expect(orderDetails).toBeNull();

    const cancelResult = await cancelOrderAction(order!.orderNumber);
    expect(cancelResult).toEqual({ success: false, error: "Order not found or access denied." });
    const afterDeniedMutation = await prisma.order.findUnique({
      where: { id: order!.id },
      include: { payments: true },
    });
    expect(afterDeniedMutation?.status).toBe("PENDING");
    expect(afterDeniedMutation?.paymentStatus).toBe("PENDING");
    expect(afterDeniedMutation?.payments[0].status).toBe("INITIATED");
    expect(JSON.stringify({ orderDetails, cancelResult })).not.toContain(
      payment.merchantReferenceId
    );
    expect(JSON.stringify({ orderDetails, cancelResult })).not.toContain(owner.email);

    const callbackBankTransactionId = crypto.randomUUID();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: callbackBankTransactionId,
        tran_id: payment.merchantReferenceId,
        currency: "BDT",
      }),
    });
    const response = await paymentCallback(
      new NextRequest("http://localhost/api/payments/sslcommerz/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tran_id: payment.merchantReferenceId,
          val_id: "VAL-OWNER-CALLBACK",
          status: "VALID",
        }),
      })
    );

    expect(response.status).toBe(303);
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(updatedPayment?.status).toBe("SUCCESS");
    expect(updatedPayment?.gatewayTransactionId).toBe(callbackBankTransactionId);
  });

  test("Customer-facing checkout and callback errors hide internal details", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const secretMarkers = [
      "DATABASE_URL",
      "SUPER_SECRET_PASSWORD",
      "store_password",
      "PrismaClientKnownRequestError",
      "SELECT * FROM Payment",
      "stacktrace-marker",
      "raw-gateway-credential",
    ];

    const malformed = await createOrderAction(
      { ...validCheckoutData, customerEmail: "bad-email" },
      crypto.randomUUID()
    );
    expect(malformed).toEqual({ success: false, error: "Invalid checkout information" });

    const product = await createTestProduct();
    const variant = await createTestVariant({ productId: product.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "FAILED",
        failedreason:
          "PrismaClientKnownRequestError SELECT * FROM Payment DATABASE_URL SUPER_SECRET_PASSWORD raw-gateway-credential",
      }),
    });
    const providerFailure = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(providerFailure.error).toBe(
      "Payment initiation failed. You can retry from your orders page."
    );

    await addToCart(variant.id, 1);
    (global.fetch as import("vitest").Mock).mockRejectedValueOnce(
      new Error("stacktrace-marker DATABASE_URL SUPER_SECRET_PASSWORD")
    );
    const networkFailure = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(networkFailure.error).toBe(
      "Payment initiation failed. You can retry from your orders page."
    );

    await addToCart(variant.id, 1);
    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(
        new Error("PrismaClientKnownRequestError SELECT * FROM Payment DATABASE_URL")
      );
    const databaseFailure = await createOrderAction(validCheckoutData, crypto.randomUUID());
    transactionSpy.mockRestore();
    expect(databaseFailure).toMatchObject({
      success: false,
      error: "An unexpected error occurred during order creation.",
    });

    const invalidCallback = await paymentCallback(
      new NextRequest("http://localhost/api/payments/sslcommerz/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tran_id: "UNKNOWN-TRANSACTION", val_id: "raw-gateway-credential" }),
      })
    );
    expect(invalidCallback.status).toBe(303);
    expect(invalidCallback.headers.get("location")).toBe(
      new URL(
        "/cart?error=payment_verification_failed",
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      ).toString()
    );

    const exposed = JSON.stringify([
      malformed,
      providerFailure,
      networkFailure,
      databaseFailure,
      invalidCallback.headers.get("location"),
    ]);
    for (const marker of secretMarkers) expect(exposed).not.toContain(marker);
  });

  test("Decimal order, discounted line items, payment, and gateway amount stay consistent", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    const discountedProduct = await createTestProduct();
    const discountedVariant = await createTestVariant({
      productId: discountedProduct.id,
      sellingPrice: new Prisma.Decimal("0.30"),
      discountPrice: new Prisma.Decimal("0.10"),
    });
    await createTestInventory(discountedVariant.id, 5);
    await addToCart(discountedVariant.id, 3);

    const secondProduct = await createTestProduct();
    const secondVariant = await createTestVariant({
      productId: secondProduct.id,
      sellingPrice: new Prisma.Decimal("0.20"),
    });
    await createTestInventory(secondVariant.id, 5);
    await addToCart(secondVariant.id, 3);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const checkout = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(checkout.success).toBe(true);

    const order = await prisma.order.findUnique({
      where: { orderNumber: checkout.orderNumber as string },
      include: { items: true, payments: true },
    });
    expect(order).not.toBeNull();
    expect(order!.subtotal.equals(new Prisma.Decimal("0.90"))).toBe(true);
    expect(order!.total.equals(new Prisma.Decimal("50.90"))).toBe(true);
    expect(order!.items).toHaveLength(2);
    expect(
      order!.items.find((item) => item.sku === discountedVariant.sku)?.lineTotal.equals("0.30")
    ).toBe(true);
    expect(
      order!.items.find((item) => item.sku === discountedVariant.sku)?.discountAmount.equals("0.60")
    ).toBe(true);
    expect(order!.payments).toHaveLength(1);
    expect(order!.payments[0].amount.equals(new Prisma.Decimal("50.90"))).toBe(true);

    const decimalBankTransactionId = crypto.randomUUID();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "50.90",
        bank_tran_id: decimalBankTransactionId,
        tran_id: order!.payments[0].merchantReferenceId,
        currency: "BDT",
      }),
    });
    const gatewayValidation = await new SSLCommerzProvider().verifyPayment({
      val_id: "VAL-DECIMAL",
    });
    expect(gatewayValidation.success).toBe(true);
    expect(new Prisma.Decimal(gatewayValidation.verifiedAmount!).equals(order!.total)).toBe(true);

    const callbackBankTransactionId = crypto.randomUUID();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "50.90",
        bank_tran_id: callbackBankTransactionId,
        tran_id: order!.payments[0].merchantReferenceId,
        currency: "BDT",
      }),
    });
    await new PaymentService().verifyCallback("SSLCOMMERZ", {
      tran_id: order!.payments[0].merchantReferenceId,
      val_id: "VAL-DECIMAL",
    });
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: order!.payments[0].id },
    });
    expect(updatedPayment?.status).toBe("SUCCESS");
    expect(updatedPayment?.gatewayTransactionId).toBe(callbackBankTransactionId);
    expect(updatedPayment?.amount.equals(order!.total)).toBe(true);
  });

  test("Unverified browser failure callback keeps payment INITIATED and reservations intact", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });
    expect(payment).toBeDefined();

    // Unverified browser fail_url POST without val_id
    const response = await paymentCallback(
      new NextRequest("http://localhost/api/payments/sslcommerz/callback?status=fail", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          tran_id: payment!.merchantReferenceId!,
          status: "FAILED",
          failedreason: "Card expired or insufficient funds",
        }).toString(),
      })
    );

    // Browser receives redirect so UI reflects attempt
    expect(response.status).toBe(303);
    const location = response.headers.get("location");
    expect(location).toContain(`/order-success/${encodeURIComponent(res.orderNumber as string)}`);
    expect(location).toContain("payment=failed");

    // Safeguard 1: Payment record must remain INITIATED and reservations unchanged
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("INITIATED");

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).toBe("PENDING");

    const activeReservations = await prisma.inventoryReservation.findMany({
      where: { orderId: payment!.orderId, status: "RESERVED" },
    });
    expect(activeReservations.length).toBe(1);

    const releasedReservations = await prisma.inventoryReservation.findMany({
      where: { orderId: payment!.orderId, status: "RELEASED" },
    });
    expect(releasedReservations.length).toBe(0);

    const sales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(sales.length).toBe(0);
  });

  test("Unverified browser cancellation callback keeps payment INITIATED and reservations intact", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });
    expect(payment).toBeDefined();

    // Unverified browser cancel_url POST without val_id
    const response = await paymentCallback(
      new NextRequest("http://localhost/api/payments/sslcommerz/callback?status=cancel", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          tran_id: payment!.merchantReferenceId!,
          status: "CANCELLED",
        }).toString(),
      })
    );

    expect(response.status).toBe(303);
    const location = response.headers.get("location");
    expect(location).toContain(`/order-success/${encodeURIComponent(res.orderNumber as string)}`);
    expect(location).toContain("payment=cancelled");

    // Safeguard 1: Payment record must remain INITIATED and reservations unchanged
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("INITIATED");

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).toBe("PENDING");

    const activeReservations = await prisma.inventoryReservation.findMany({
      where: { orderId: payment!.orderId, status: "RESERVED" },
    });
    expect(activeReservations.length).toBe(1);

    const releasedReservations = await prisma.inventoryReservation.findMany({
      where: { orderId: payment!.orderId, status: "RELEASED" },
    });
    expect(releasedReservations.length).toBe(0);

    const sales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(sales.length).toBe(0);
  });

  test("Server-verified failure callback via validation API updates payment to FAILED and releases reservation", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    // Mock SSLCommerz validationserverAPI returning server-verified FAILED
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "FAILED",
        tran_id: payment!.merchantReferenceId,
        failedreason: "Bank transaction declined",
      }),
    });

    const paymentService = new PaymentService();
    const verifyRes = await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment!.merchantReferenceId,
      val_id: "VAL-SERVER-FAILED",
      status: "FAILED",
    });

    expect(verifyRes.verification.status).toBe("FAILED");

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("FAILED");

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).toBe("FAILED");

    const activeReservations = await prisma.inventoryReservation.findMany({
      where: { orderId: payment!.orderId, status: "RESERVED" },
    });
    expect(activeReservations.length).toBe(0);

    const releasedReservations = await prisma.inventoryReservation.findMany({
      where: { orderId: payment!.orderId, status: "RELEASED" },
    });
    expect(releasedReservations.length).toBe(1);
  });

  test("Server-verified late SUCCESS after failure safely reconciles and consumes inventory without duplicates", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    // 1. Prior server-verified failure
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "FAILED",
        tran_id: payment!.merchantReferenceId,
        failedreason: "Declined initially",
      }),
    });
    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment!.merchantReferenceId,
      val_id: "VAL-FAIL",
    });

    const paymentAfterFail = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(paymentAfterFail?.status).toBe("FAILED");

    // 2. Late genuine SUCCESS validated by SSLCommerz
    const bankTranId = crypto.randomUUID();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: bankTranId,
        tran_id: payment!.merchantReferenceId,
        currency: "BDT",
      }),
    });

    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment!.merchantReferenceId,
      val_id: "VAL-LATE-SUCCESS",
    });

    const recoveredPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(recoveredPayment?.status).toBe("SUCCESS");
    expect(recoveredPayment?.gatewayTransactionId).toBe(bankTranId);

    const recoveredOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(recoveredOrder?.paymentStatus).toBe("SUCCESS");

    const sales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(sales.length).toBe(1);

    // 3. Repeated callback does not double-consume inventory
    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment!.merchantReferenceId,
      val_id: "VAL-LATE-SUCCESS",
    });
    const finalSales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(finalSales.length).toBe(1);
  });

  test("Late SUCCESS with insufficient available stock does not silently oversell", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 1); // Only 1 unit in stock
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    // 1. Initial verified failure releases reservation
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "FAILED",
        tran_id: payment!.merchantReferenceId,
      }),
    });
    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment!.merchantReferenceId,
      val_id: "VAL-FAIL",
    });

    // 2. Another order buys the remaining 1 unit of stock
    await prisma.inventoryTransaction.create({
      data: {
        variantId: variant.id,
        type: "SALE",
        quantity: -1,
        referenceId: "OTHER-ORDER",
      },
    });

    // 3. Late genuine SUCCESS arrives for original order when stock is 0
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: crypto.randomUUID(),
        tran_id: payment!.merchantReferenceId,
        currency: "BDT",
      }),
    });

    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment!.merchantReferenceId,
      val_id: "VAL-LATE-OVERSELL",
    });

    const paymentRecord = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(paymentRecord?.status).toBe("SUCCESS");

    // Order flagged as PENDING for manual review
    const orderRecord = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(orderRecord?.paymentStatus).toBe("SUCCESS");
    expect(orderRecord?.status).toBe("PENDING");

    // Must NOT silently oversell: no SALE transactions created for this order
    const sales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(sales.length).toBe(0);
  });

  test("Unverified browser payload claiming VALID without val_id is rejected and never marks order PAID", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    // Untrusted payload without val_id
    const response = await paymentCallback(
      new NextRequest("http://localhost/api/payments/sslcommerz/callback?status=success", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          tran_id: payment!.merchantReferenceId!,
          status: "VALID",
        }).toString(),
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/cart?error=payment_verification_failed");

    const paymentRecord = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(paymentRecord?.status).toBe("INITIATED");

    const orderRecord = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(orderRecord?.paymentStatus).toBe("PENDING");

    const sales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(sales.length).toBe(0);
  });

  test("IPN acknowledgment returns HTTP 200 without redirect, verifies server-side, and commits inventory", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    const bankTranId = crypto.randomUUID();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: bankTranId,
        tran_id: payment!.merchantReferenceId,
        currency: "BDT",
      }),
    });

    const ipnReq = new NextRequest("http://localhost/api/payments/sslcommerz/callback?status=ipn", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        tran_id: payment!.merchantReferenceId!,
        val_id: "VAL-IPN-SUCCESS",
        status: "VALID",
      }).toString(),
    });

    const ipnRes = await paymentCallback(ipnReq);
    expect(ipnRes.status).toBe(200);
    const bodyText = await ipnRes.text();
    expect(bodyText).toBe("IPN OK");

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("SUCCESS");
    expect(updatedPayment?.gatewayTransactionId).toBe(bankTranId);

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).toBe("SUCCESS");

    const sales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(sales.length).toBe(1);

    // Duplicate IPN acknowledged with HTTP 200 without double-consuming inventory
    const duplicateIpnReq = new NextRequest("http://localhost/api/payments/sslcommerz/callback?status=ipn", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        tran_id: payment!.merchantReferenceId!,
        val_id: "VAL-IPN-SUCCESS",
        status: "VALID",
      }).toString(),
    });

    const duplicateIpnRes = await paymentCallback(duplicateIpnReq);
    expect(duplicateIpnRes.status).toBe(200);
    expect(await duplicateIpnRes.text()).toBe("IPN OK");

    const finalSales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(finalSales.length).toBe(1);

    // Conflicting terminal state: Confirmed SUCCESS payment cannot be overwritten by failure callback
    const conflictingCancelReq = new NextRequest("http://localhost/api/payments/sslcommerz/callback?status=cancel", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        tran_id: payment!.merchantReferenceId!,
        status: "CANCELLED",
      }).toString(),
    });
    const cancelRes = await paymentCallback(conflictingCancelReq);
    expect(cancelRes.status).toBe(303);
    expect(cancelRes.headers.get("location")).toContain("payment=success");

    const protectedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(protectedPayment?.status).toBe("SUCCESS");

    const protectedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(protectedOrder?.paymentStatus).toBe("SUCCESS");

    const protectedSales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(protectedSales.length).toBe(1);
  });

  test("Direct server IPN POST without status query parameter returns HTTP 200 without redirect", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    const bankTranId = crypto.randomUUID();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: bankTranId,
        tran_id: payment!.merchantReferenceId,
        currency: "BDT",
      }),
    });

    // POST directly to /api/payments/sslcommerz/callback without ?status=ipn query param and without Accept: text/html
    const directIpnReq = new NextRequest("http://localhost/api/payments/sslcommerz/callback", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-sslcommerz-ipn": "true",
      },
      body: new URLSearchParams({
        tran_id: payment!.merchantReferenceId!,
        val_id: "VAL-DIRECT-IPN",
        status: "VALID",
      }).toString(),
    });

    const directIpnRes = await paymentCallback(directIpnReq);
    expect(directIpnRes.status).toBe(200);
    expect(await directIpnRes.text()).toBe("IPN OK");

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("SUCCESS");
  });

  test("Server-verified callback with mismatched merchant reference is rejected", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    // Validation returns different tran_id
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: crypto.randomUUID(),
        tran_id: "DIFFERENT-TRAN-ID-12345",
        currency: "BDT",
      }),
    });

    const paymentService = new PaymentService();
    await expect(
      paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: payment!.merchantReferenceId,
        val_id: "VAL-MISMATCHED-TRAN-ID",
      })
    ).rejects.toThrow("Payment verification failed: Transaction or Currency Mismatch");

    const paymentRecord = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(paymentRecord?.status).toBe("INITIATED");
  });

  test("Late SUCCESS after reservation TTL expiration safely recovers and commits inventory under row lock", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "SUCCESS",
        GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
      }),
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } },
    });

    // Artificially expire the reservation (simulate 15-minute TTL elapsed)
    await prisma.inventoryReservation.updateMany({
      where: { orderId: payment!.orderId },
      data: { expiresAt: new Date(Date.now() - 60000) },
    });

    // Late verified SUCCESS arrives
    const bankTranId = crypto.randomUUID();
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: bankTranId,
        tran_id: payment!.merchantReferenceId,
        currency: "BDT",
      }),
    });

    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: payment!.merchantReferenceId,
      val_id: "VAL-EXPIRED-TTL-SUCCESS",
    });

    const paymentRecord = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(paymentRecord?.status).toBe("SUCCESS");

    const orderRecord = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(orderRecord?.paymentStatus).toBe("SUCCESS");

    // Stock was available, so SALE was safely created
    const sales = await prisma.inventoryTransaction.findMany({
      where: { referenceId: payment!.orderId, type: "SALE" },
    });
    expect(sales.length).toBe(1);
    expect(sales[0].quantity).toBe(-1);

    // Reservation was committed
    const reservation = await prisma.inventoryReservation.findFirst({
      where: { orderId: payment!.orderId },
    });
    expect(reservation?.status).toBe("COMMITTED");
  });
});
