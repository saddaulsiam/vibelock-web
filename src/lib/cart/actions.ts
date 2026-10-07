"use server";

import { revalidatePath } from "next/cache";
import { addToCart, updateCartItemQuantity, removeCartItem } from "./mutations";
import { getCart } from "./queries";

export async function addVariantToCartAction(variantId: string, quantity: number = 1) {
  try {
    const cart = await addToCart(variantId, quantity);
    revalidatePath("/cart");
    return { success: true, cart };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add to cart" };
  }
}

export async function updateCartItemAction(cartItemId: string, quantity: number) {
  try {
    const cart = await updateCartItemQuantity(cartItemId, quantity);
    revalidatePath("/cart");
    return { success: true, cart };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update quantity" };
  }
}

export async function removeCartItemAction(cartItemId: string) {
  try {
    const cart = await removeCartItem(cartItemId);
    revalidatePath("/cart");
    return { success: true, cart };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove item" };
  }
}

export async function fetchCartAction() {
  try {
    const cart = await getCart();
    return { success: true, cart };
  } catch {
    return { success: false, error: "Failed to fetch cart" };
  }
}
