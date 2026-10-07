import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { GUEST_CART_COOKIE, CART_INCLUDES } from "./queries";
import { mapCart } from "./mappers";
import { CartDTO } from "./types";
import { ProductStatus } from "@prisma/client";

export const MAX_QUANTITY = 10; // Business rule max quantity

export async function getOrCreateCartId(): Promise<string> {
  const session = await auth();
  const c = await cookies();
  const guestCartId = c.get(GUEST_CART_COOKIE)?.value;

  if (session?.user?.id) {
    let authCart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
    });

    // Case: User has no cart, but has guest cookie
    if (!authCart && guestCartId) {
      const guestCart = await prisma.cart.findUnique({ where: { id: guestCartId } });
      if (guestCart && !guestCart.userId) {
        authCart = await prisma.cart.update({
          where: { id: guestCart.id },
          data: { userId: session.user.id },
        });
        c.delete(GUEST_CART_COOKIE);
        return authCart.id;
      }
    }

    // Case: User has no cart, and no guest cookie
    if (!authCart) {
      authCart = await prisma.cart.create({
        data: { userId: session.user.id },
      });
      return authCart.id;
    }

    // Case: User has cart, AND has guest cookie. We must merge.
    if (authCart && guestCartId && authCart.id !== guestCartId) {
      const guestCart = await prisma.cart.findUnique({
        where: { id: guestCartId },
        include: { items: true },
      });

      if (guestCart && !guestCart.userId) {
        await prisma.$transaction(async (tx) => {
          for (const guestItem of guestCart.items) {
            const authItem = await tx.cartItem.findUnique({
              where: { cartId_variantId: { cartId: authCart!.id, variantId: guestItem.variantId } },
            });

            if (authItem) {
              const newQuantity = Math.min(authItem.quantity + guestItem.quantity, MAX_QUANTITY);
              await tx.cartItem.update({
                where: { id: authItem.id },
                data: { quantity: newQuantity },
              });
            } else {
              await tx.cartItem.create({
                data: {
                  cartId: authCart!.id,
                  variantId: guestItem.variantId,
                  quantity: Math.min(guestItem.quantity, MAX_QUANTITY),
                },
              });
            }
          }
          await tx.cart.delete({ where: { id: guestCart.id } });
        });
        c.delete(GUEST_CART_COOKIE);
      }
    }
    
    return authCart.id;
  }

  // Guest flow
  if (guestCartId) {
    const cart = await prisma.cart.findUnique({ where: { id: guestCartId } });
    if (cart && !cart.userId) {
      return cart.id;
    }
  }

  const newCart = await prisma.cart.create({ data: {} });
  c.set(GUEST_CART_COOKIE, newCart.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return newCart.id;
}

export async function addToCart(variantId: string, quantity: number): Promise<CartDTO> {
  if (quantity < 1 || quantity > MAX_QUANTITY) {
    throw new Error("Invalid quantity");
  }

  // Find variant and verify it's published
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: true,
      inventoryTransactions: { select: { quantity: true } },
      inventoryReservations: { select: { quantity: true, expiresAt: true }, where: { status: "RESERVED" } },
    },
  });

  if (!variant || variant.product.status !== ProductStatus.PUBLISHED) {
    throw new Error("Product variant is unavailable");
  }

  // Check physical availability
  const totalStock = variant.inventoryTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
  const now = new Date();
  const reserved = variant.inventoryReservations.reduce((sum, r) => (r.expiresAt > now ? sum + r.quantity : sum), 0);
  const availableStock = totalStock - reserved;

  const cartId = await getOrCreateCartId();

  // Handle atomic upsert safely in transaction
  const updatedCart = await prisma.$transaction(async (tx) => {
    const existingItem = await tx.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId } },
    });

    const newQuantity = Math.min((existingItem?.quantity || 0) + quantity, MAX_QUANTITY);
    
    if (newQuantity > availableStock) {
      throw new Error("Insufficient stock available");
    }

    await tx.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, variantId, quantity: newQuantity },
      update: { quantity: newQuantity },
    });

    return tx.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: CART_INCLUDES,
    });
  });

  return mapCart(updatedCart);
}

export async function updateCartItemQuantity(cartItemId: string, quantity: number): Promise<CartDTO> {
  if (quantity < 1 || quantity > MAX_QUANTITY) {
    throw new Error("Invalid quantity");
  }

  const cartId = await getOrCreateCartId(); // Will throw if trying to manipulate cross-cart

  const updatedCart = await prisma.$transaction(async (tx) => {
    const existingItem = await tx.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        variant: {
          include: {
            inventoryTransactions: { select: { quantity: true } },
            inventoryReservations: { select: { quantity: true, expiresAt: true }, where: { status: "RESERVED" } },
          },
        },
      },
    });

    if (!existingItem || existingItem.cartId !== cartId) {
      throw new Error("Cart item not found");
    }

    const totalStock = existingItem.variant.inventoryTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
    const now = new Date();
    const reserved = existingItem.variant.inventoryReservations.reduce((sum, r) => (r.expiresAt > now ? sum + r.quantity : sum), 0);
    const availableStock = totalStock - reserved;

    if (quantity > availableStock) {
      throw new Error("Insufficient stock available");
    }

    await tx.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    return tx.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: CART_INCLUDES,
    });
  });

  return mapCart(updatedCart);
}

export async function removeCartItem(cartItemId: string): Promise<CartDTO> {
  const cartId = await getOrCreateCartId();

  const existingItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
  });

  if (!existingItem || existingItem.cartId !== cartId) {
    throw new Error("Cart item not found");
  }

  await prisma.cartItem.delete({
    where: { id: cartItemId },
  });

  const cart = await prisma.cart.findUniqueOrThrow({
    where: { id: cartId },
    include: CART_INCLUDES,
  });

  return mapCart(cart);
}
