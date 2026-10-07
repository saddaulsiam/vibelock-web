import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "../../src/lib/prisma/client";
import { createTestProduct, createTestVariant, createTestInventory } from "../factories";
import { createTestUser } from "../factories/user";
import { addToCart } from "../../src/lib/cart/mutations";
import { createOrderAction } from "../../src/lib/checkout/actions";
import { PaymentService } from "../../src/lib/payment/service";
import crypto from "crypto";

const mockCookies = new Map();
let mockSession: unknown = null;

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string, value: string, options: unknown) => mockCookies.set(key, { value, options }),
    delete: (key: string) => mockCookies.delete(key),
  }))
}));

vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession))
}));

// Mock shipping pricing
vi.mock("../../src/lib/shipping/pricing", () => ({
  calculateShippingCharge: vi.fn(() => 50)
}));

vi.mock("../../src/lib/config/env", () => ({
  env: {
    SSLCOMMERZ_STORE_ID: "test_store",
    SSLCOMMERZ_STORE_PASSWORD: "test_password",
    SSLCOMMERZ_SANDBOX: true,
    INVENTORY_RESERVATION_TTL_SECONDS: 600,
  }
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
    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://sandbox.sslcommerz.com/pay" })
    });

    const idempotencyKey = crypto.randomUUID();
    const res = await createOrderAction(validCheckoutData, idempotencyKey);
    
    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("https://sandbox.sslcommerz.com/pay");
    expect(res.orderNumber).toBeDefined();

    const payment = await prisma.payment.findFirst({
      where: { order: { orderNumber: res.orderNumber as string } }
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

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "FAILED", failedreason: "Invalid credentials" })
    });

    const idempotencyKey = crypto.randomUUID();
    const res = await createOrderAction(validCheckoutData, idempotencyKey);
    
    expect(res.success).toBe(true);
    expect(res.error).toContain("Payment initiation failed");

    // Order should remain PENDING but with error returned
    const order = await prisma.order.findFirst({ where: { checkoutIdempotencyKey: idempotencyKey } });
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

    (global.fetch as import('vitest').Mock).mockRejectedValueOnce(new Error("Network Error"));

    const idempotencyKey = crypto.randomUUID();
    const res = await createOrderAction(validCheckoutData, idempotencyKey);
    
    expect(res.success).toBe(true);
    expect(res.error).toContain("Payment initiation failed");

    // Order should remain PENDING
    const order = await prisma.order.findFirst({ where: { checkoutIdempotencyKey: idempotencyKey } });
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
    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://sandbox.sslcommerz.com/pay" })
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(res.success).toBe(true);

    const payment = await prisma.payment.findFirst({ where: { order: { orderNumber: res.orderNumber as string } } });
    expect(payment?.status).toBe("INITIATED");

    // Reservation should exist
    const initialReservations = await prisma.inventoryReservation.findMany({ where: { variantId: variant.id } });
    expect(initialReservations.length).toBeGreaterThan(0);

    // Validation API callback
    const bankTranId = crypto.randomUUID();
    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: bankTranId,
      })
    });

    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, val_id: "VAL123" });

    // Check payment & order state
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("SUCCESS");
    expect(updatedPayment?.gatewayTransactionId).toBe(bankTranId);

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).toBe("SUCCESS");

    // Reservation should be consumed (marked COMMITTED or deleted)
    const finalReservations = await prisma.inventoryReservation.findMany({ where: { variantId: variant.id, status: "RESERVED" } });
    expect(finalReservations.length).toBe(0);

    const inventoryTx = await prisma.inventoryTransaction.findMany({ where: { variantId: variant.id, type: "SALE", referenceId: payment!.orderId } });
    expect(inventoryTx.length).toBe(1); // exactly once
  });

  test("10. Amount Mismatch", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://sandbox.sslcommerz.com/pay" })
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    
    const payment = await prisma.payment.findFirst({ where: { order: { orderNumber: res.orderNumber as string } } });

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "1.00", // Wrong amount
        bank_tran_id: crypto.randomUUID(),
      })
    });

    const paymentService = new PaymentService();
    await expect(paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, val_id: "VAL123" }))
      .rejects.toThrow("Amount Mismatch");

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("FAILED"); // Handled safely

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).not.toBe("SUCCESS");

    // Inventory should NOT be committed
    const inventoryTx = await prisma.inventoryTransaction.findMany({ where: { variantId: variant.id, type: "SALE", referenceId: payment!.orderId } });
    expect(inventoryTx.length).toBe(0);
  });

  test("11. Invalid / Unknown Transaction", async () => {
    const paymentService = new PaymentService();
    
    // Missing tran_id
    await expect(paymentService.verifyCallback("SSLCOMMERZ", { val_id: "VAL123" }))
      .rejects.toThrow("Missing transaction reference");

    // Unknown tran_id
    await expect(paymentService.verifyCallback("SSLCOMMERZ", { tran_id: "UNKNOWN", val_id: "VAL123" }))
      .rejects.toThrow("Payment record not found");
  });

  test("12. FAILED callback", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://sandbox.sslcommerz.com/pay" })
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({ where: { order: { orderNumber: res.orderNumber as string } } });

    // Client callback sends status=FAILED
    // The SSLCommerz provider verifyPayment handles status=FAILED without calling validation API
    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, status: "FAILED" });

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("FAILED");

    const updatedOrder = await prisma.order.findUnique({ where: { id: payment!.orderId } });
    expect(updatedOrder?.paymentStatus).toBe("FAILED");

    // Reservation should be released
    const finalReservations = await prisma.inventoryReservation.findMany({ where: { variantId: variant.id, status: "RESERVED" } });
    expect(finalReservations.length).toBe(0);
  });

  test("13. CANCELLED callback", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://sandbox.sslcommerz.com/pay" })
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({ where: { order: { orderNumber: res.orderNumber as string } } });

    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, status: "CANCELLED" });

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("CANCELLED");
  });

  test("14. Duplicate callback / Idempotency & 21. Concurrency", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://sandbox.sslcommerz.com/pay" })
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({ where: { order: { orderNumber: res.orderNumber as string } } });

    // First Validation API fetch
    const bankTranId = crypto.randomUUID();
    (global.fetch as import('vitest').Mock).mockResolvedValue({
      json: async () => ({ status: "VALID", amount: "150.00", bank_tran_id: bankTranId })
    });

    const paymentService = new PaymentService();

    // Run concurrently
    await Promise.all([
      paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, val_id: "VAL123" }),
      paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, val_id: "VAL123" }),
      paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, val_id: "VAL123" }) // Should be skipped locally in method if atomic
    ]);

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("SUCCESS");

    const inventoryTx = await prisma.inventoryTransaction.findMany({ where: { variantId: variant.id, type: "SALE", referenceId: payment!.orderId } });
    expect(inventoryTx.length).toBe(1); // exactly once!
  });

  test("15. Late Callback Protection", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://sandbox.sslcommerz.com/pay" })
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({ where: { order: { orderNumber: res.orderNumber as string } } });

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "VALID", amount: "150.00", bank_tran_id: crypto.randomUUID() })
    });
    const paymentService = new PaymentService();

    // 1. Success
    await paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, val_id: "VAL123" });
    
    // 2. Late Failed
    await paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, status: "FAILED" });

    // 3. Late Cancelled
    await paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, status: "CANCELLED" });

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.status).toBe("SUCCESS"); // Downgrade prevented

    const inventoryTx = await prisma.inventoryTransaction.findMany({ where: { variantId: variant.id, type: "SALE", referenceId: payment!.orderId } });
    expect(inventoryTx.length).toBe(1); // Remains 1, no reversal
  });

  test("19. Sensitive data leakage", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, sellingPrice: 100 });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({ status: "SUCCESS", GatewayPageURL: "https://sandbox.sslcommerz.com/pay" })
    });
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    const payment = await prisma.payment.findFirst({ where: { order: { orderNumber: res.orderNumber as string } } });

    (global.fetch as import('vitest').Mock).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: "150.00",
        bank_tran_id: crypto.randomUUID(),
        store_passwd: "SUPER_SECRET_PASSWORD",
        store_id: "MY_STORE_ID"
      })
    });

    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", { tran_id: payment?.merchantReferenceId, val_id: "VAL123" });

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(updatedPayment?.gatewayPayload).toBeDefined();

    const payload = updatedPayment?.gatewayPayload as Record<string, unknown>;
    expect(payload.store_passwd).toBeUndefined();
    expect(payload.store_id).toBeUndefined();
    expect(payload.status).toBe("VALID");
  });
});
