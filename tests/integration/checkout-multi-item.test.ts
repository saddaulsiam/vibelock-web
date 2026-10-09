import { describe, test, expect, beforeEach, vi } from "vitest";
import prisma from "../../src/lib/prisma/client";
import {
  createTestProduct,
  createTestVariant,
  createTestInventory,
} from "../factories";
import { createTestUser } from "../factories/user";
import { addToCart } from "../../src/lib/cart/mutations";
import { createOrderAction } from "../../src/lib/checkout/actions";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

const mockCookies = new Map<string, { value: string }>();
let mockSession: unknown = null;

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string, value: string) => mockCookies.set(key, { value }),
    delete: (key: string) => mockCookies.delete(key),
  })),
}));

vi.mock("../../src/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

// Mock fallback shipping pricing so tests remain fast and isolated
vi.mock("../../src/lib/shipping/pricing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/shipping/pricing")>();
  return {
    ...actual,
    calculateShippingCharge: vi.fn(() => 60),
  };
});

describe("Multi-Item Checkout & Transaction Optimization", () => {
  beforeEach(() => {
    mockCookies.clear();
    mockSession = null;
  });

  const validCheckoutData = {
    customerName: "Multi Item Customer",
    customerEmail: "multi@example.com",
    customerPhone: "01700000000",
    shippingStreet: "Road 12, Banani",
    shippingCity: "Dhaka",
    shippingState: "Dhaka",
    shippingZip: "1213",
    shippingCountry: "BD",
    paymentMethod: "COD" as const,
  };

  test("Successfully processes multi-item COD checkout with atomic batched reservations and inventory ledger", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    // 1. Create 3 different products and variants with sufficient inventory
    const p1 = await createTestProduct();
    const v1 = await createTestVariant({
      productId: p1.id,
      sellingPrice: new Prisma.Decimal("500"),
      costPrice: new Prisma.Decimal("300"),
    });
    await createTestInventory(v1.id, 10);

    const p2 = await createTestProduct();
    const v2 = await createTestVariant({
      productId: p2.id,
      sellingPrice: new Prisma.Decimal("750"),
      costPrice: new Prisma.Decimal("450"),
    });
    await createTestInventory(v2.id, 10);

    const p3 = await createTestProduct();
    const v3 = await createTestVariant({
      productId: p3.id,
      sellingPrice: new Prisma.Decimal("1000"),
      costPrice: new Prisma.Decimal("600"),
    });
    await createTestInventory(v3.id, 10);

    // 2. Add all 3 variants to cart
    await addToCart(v1.id, 2);
    await addToCart(v2.id, 1);
    await addToCart(v3.id, 3);

    const idempotencyKey = crypto.randomUUID();

    // 3. Execute checkout
    const result = await createOrderAction(validCheckoutData, idempotencyKey);

    expect(result.success).toBe(true);
    expect(result.orderNumber).toBeDefined();

    // 4. Verify created order in database
    const order = await prisma.order.findUnique({
      where: { orderNumber: result.orderNumber },
      include: { items: true },
    });

    expect(order).not.toBeNull();
    expect(order?.status).toBe("PENDING");
    expect(order?.paymentStatus).toBe("PENDING");
    expect(order?.paymentMethod).toBe("COD");
    expect(order?.items.length).toBe(3);

    // Expected subtotal: 2*500 + 1*750 + 3*1000 = 1000 + 750 + 3000 = 4750
    expect(Number(order?.subtotal)).toBe(4750);
    // Shipping: 60
    expect(Number(order?.shippingCost)).toBe(60);
    // Total: 4810
    expect(Number(order?.total)).toBe(4810);

    // 5. Verify reservations are COMMITTED for COD
    const reservations = await prisma.inventoryReservation.findMany({
      where: { orderId: order!.id },
    });
    expect(reservations.length).toBe(3);
    for (const res of reservations) {
      expect(res.status).toBe("COMMITTED");
    }

    // 6. Verify SALE transactions exist in ledger with negative quantities
    const ledgerEntries = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order!.id, type: "SALE" },
    });
    expect(ledgerEntries.length).toBe(3);

    const v1Entry = ledgerEntries.find((e) => e.variantId === v1.id);
    expect(v1Entry?.quantity).toBe(-2);

    const v2Entry = ledgerEntries.find((e) => e.variantId === v2.id);
    expect(v2Entry?.quantity).toBe(-1);

    const v3Entry = ledgerEntries.find((e) => e.variantId === v3.id);
    expect(v3Entry?.quantity).toBe(-3);

    // 7. Verify idempotency / retry handling: calling consumeReservation again does not throw or create duplicate ledger entries
    const { InventoryService } = await import("../../src/lib/inventory/service");
    await expect(InventoryService.consumeReservation(order!.id)).resolves.not.toThrow();
    const ledgerAfterRetry = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order!.id, type: "SALE" },
    });
    expect(ledgerAfterRetry.length).toBe(3);

    // 8. Verify cart is cleared
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });
    expect(cart?.items.length).toBe(0);
  }, 25000);

  test("Handles transaction timeout (P2028) with actionable customer message and correlation ID", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    const p = await createTestProduct();
    const v = await createTestVariant({
      productId: p.id,
      sellingPrice: new Prisma.Decimal("200"),
    });
    await createTestInventory(v.id, 5);
    await addToCart(v.id, 1);

    // Mock $transaction to reject with P2028 error
    const spy = vi.spyOn(prisma, "$transaction").mockRejectedValueOnce({
      name: "PrismaClientKnownRequestError",
      code: "P2028",
      message: "Transaction API error: Transaction not found",
    });

    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());

    expect(res.success).toBe(false);
    expect(res.error).toBe("Checkout timed out while securing items. Please try again.");
    expect(res.correlationId).toBeDefined();

    spy.mockRestore();
  });
});
