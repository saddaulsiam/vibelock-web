import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { mapCart } from "./mappers";
import { CartDTO } from "./types";

export const GUEST_CART_COOKIE = "vbl_cart_id";

// Standard includes to load a cart with variants, prices, inventory, and product info
export const CART_INCLUDES = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
          inventoryTransactions: {
            select: { quantity: true },
          },
          inventoryReservations: {
            select: { quantity: true, expiresAt: true },
            where: { status: "RESERVED" as const },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

/**
 * Gets the current active cart based on session or cookie.
 */
export async function getCart(): Promise<CartDTO | null> {
  const session = await auth();
  const c = await cookies();
  const guestCartId = c.get(GUEST_CART_COOKIE)?.value;

  // 1. Authenticated User
  if (session?.user?.id) {
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: CART_INCLUDES,
    });

    if (cart) return mapCart(cart);

    // If authenticated user has no cart, but there is a guest cart, we could merge it here,
    // but typically merging is an explicit action during login or first cart fetch.
    // For now, let's just return the guest cart if the user doesn't have one and we can claim it.
    if (guestCartId) {
      const guestCart = await prisma.cart.findUnique({
        where: { id: guestCartId },
        include: CART_INCLUDES,
      });

      if (guestCart && !guestCart.userId) {
        // Claim the guest cart for this user
        const claimedCart = await prisma.cart.update({
          where: { id: guestCart.id },
          data: { userId: session.user.id },
          include: CART_INCLUDES,
        });
        
        // Remove the cookie as it's now attached to the user account
        c.delete(GUEST_CART_COOKIE);
        return mapCart(claimedCart);
      }
    }

    return null;
  }

  // 2. Guest User
  if (guestCartId) {
    const cart = await prisma.cart.findUnique({
      where: { id: guestCartId },
      include: CART_INCLUDES,
    });

    // Only return it if it is strictly a guest cart (not claimed by someone else)
    if (cart && !cart.userId) {
      return mapCart(cart);
    }
  }

  return null;
}
