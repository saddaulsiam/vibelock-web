import { describe, test, expect, beforeEach, vi } from "vitest";
import prisma from "../../src/lib/prisma/client";
import { createTestProduct, createTestVariant, createTestInventory } from "../factories";
import { createTestUser } from "../factories/user";
import { getOrCreateCartId, addToCart, updateCartItemQuantity } from "../../src/lib/cart/mutations";
import { Prisma } from "@prisma/client";

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

describe("Phase 3E - Cart", () => {
  beforeEach(() => {
    mockCookies.clear();
    mockSession = null;
  });

  test("3E.1 Guest cart creation", async () => {
    const cartId = await getOrCreateCartId();
    expect(cartId).toBeDefined();

    const cookie = mockCookies.get("vbl_cart_id");
    expect(cookie).toBeDefined();
    expect(cookie.value).toBe(cartId);
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.sameSite).toBe("lax");
    expect(cookie.options.maxAge).toBeGreaterThan(0);
  });

  test("3E.3 Authenticated cart", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    const cartId = await getOrCreateCartId();
    expect(cartId).toBeDefined();

    const dbCart = await prisma.cart.findUnique({ where: { id: cartId } });
    expect(dbCart?.userId).toBe(user.id);

    // Another user cannot access
    const user2 = await createTestUser();
    mockSession = { user: { id: user2.id } };
    const cartId2 = await getOrCreateCartId();
    expect(cartId2).not.toBe(cartId);
  });

  test("3E.4 Guest -> authenticated claim (Case A: no auth cart)", async () => {
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id });
    await createTestInventory(variant.id, 20);

    // 1. Guest creates cart and adds item
    mockSession = null;
    const guestCartId = await getOrCreateCartId();
    await addToCart(variant.id, 2);

    // 2. User logs in (has no cart initially)
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    
    // 3. getOrCreateCartId should merge/claim the guest cart
    const authCartId = await getOrCreateCartId();
    expect(authCartId).toBe(guestCartId); // Claimed same ID

    const dbCart = await prisma.cart.findUnique({ where: { id: authCartId } });
    expect(dbCart?.userId).toBe(user.id);
  });

  test("3E.4 Guest -> authenticated merge (Case B: has auth cart)", async () => {
    const prod = await createTestProduct();
    const variant1 = await createTestVariant({ productId: prod.id });
    await createTestInventory(variant1.id, 20);
    const variant2 = await createTestVariant({ productId: prod.id });
    await createTestInventory(variant2.id, 20);

    // 1. Guest creates cart and adds item
    mockSession = null;
    const guestCartId = await getOrCreateCartId();
    await addToCart(variant1.id, 2);
    await addToCart(variant2.id, 3); // Item only in guest

    // 2. User logs in (already has a cart with variant1)
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };
    
    // Seed user's auth cart
    const authCart = await prisma.cart.create({ data: { userId: user.id } });
    await prisma.cartItem.create({
      data: { cartId: authCart.id, variantId: variant1.id, quantity: 5 }
    });
    
    // 3. getOrCreateCartId should merge the guest cart into the auth cart
    const resultingCartId = await getOrCreateCartId();
    expect(resultingCartId).toBe(authCart.id);

    const mergedCart = await prisma.cart.findUnique({
      where: { id: authCart.id },
      include: { items: true }
    });

    // Variant 1 quantity: 5 + 2 = 7
    const mergedV1 = mergedCart?.items.find(i => i.variantId === variant1.id);
    expect(mergedV1?.quantity).toBe(7);

    // Variant 2 quantity: 3
    const mergedV2 = mergedCart?.items.find(i => i.variantId === variant2.id);
    expect(mergedV2?.quantity).toBe(3);

    // Guest cart should be deleted
    const oldGuestCart = await prisma.cart.findUnique({ where: { id: guestCartId } });
    expect(oldGuestCart).toBeNull();
  });

  test("3E.5 Quantity limits", async () => {
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id });
    await createTestInventory(variant.id, 20);

    // Add max quantity (10)
    const cart = await addToCart(variant.id, 10);
    expect(cart.items[0].quantity).toBe(10);

    // Add 1 more should be capped at 10 or fail
    // Currently the mutation does `Math.min((existingItem?.quantity || 0) + quantity, MAX_QUANTITY);`
    const cartMax = await addToCart(variant.id, 1);
    expect(cartMax.items[0].quantity).toBe(10);

    // Invalid negative quantity
    await expect(addToCart(variant.id, -1)).rejects.toThrow("Invalid quantity");
    await expect(addToCart(variant.id, 0)).rejects.toThrow("Invalid quantity");
    await expect(addToCart(variant.id, 11)).rejects.toThrow("Invalid quantity");
  });

  test("3E.6 Cart item IDOR", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    // User A adds to cart
    mockSession = { user: { id: userA.id } };
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id });
    await createTestInventory(variant.id, 20);
    const cartA = await addToCart(variant.id, 1);
    const itemA = cartA.items[0];

    // User B tries to update User A's item
    mockSession = { user: { id: userB.id } };
    // getOrCreateCartId will create User B's cart
    await getOrCreateCartId();
    await expect(updateCartItemQuantity(itemA.id, 5)).rejects.toThrow();
  });

  test("3E.7 Server-derived product pricing", async () => {
    const prod = await createTestProduct();
    const variant = await createTestVariant({ 
      productId: prod.id,
      sellingPrice: new Prisma.Decimal("100"),
      discountPrice: new Prisma.Decimal("80")
    });
    await createTestInventory(variant.id, 20);

    const cart = await addToCart(variant.id, 2); // API takes ONLY variantId and quantity
    
    // Check returned CartDTO has the server-calculated prices
    expect(cart.subtotal).toBe(160); // 80 * 2
  });

  test("3E.8 Inventory behavior (no reservation)", async () => {
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id });
    await createTestInventory(variant.id, 20);

    await addToCart(variant.id, 5);

    const reservations = await prisma.inventoryReservation.findMany({
      where: { variantId: variant.id }
    });
    expect(reservations.length).toBe(0);
  });
});
