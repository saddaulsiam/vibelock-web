"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import type { CartDTO } from "@/lib/cart/types";
import { CartItemCard } from "./cart-item-card";

interface CartPageContentProps {
  cart: CartDTO | null;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CartPageContent({ cart }: CartPageContentProps) {
  if (!cart || cart.items.length === 0) {
    return (
      <section className="flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex size-16 items-center justify-center bg-[#F3F0E8] text-[#101114]">
          <ShoppingBag className="size-7" aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          VibeLock / Cart
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your cart is empty</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Take a look through the collection and find your next everyday piece.
        </p>
        <Link
          href="/products"
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 bg-[#101114] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
        >
          Shop products <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    );
  }

  const requiresAdjustment = cart.items.some(
    (item) => item.quantity > item.availableQuantity || !item.variant.available
  );
  const discountTotal = cart.items.reduce((total, item) => {
    if (item.variant.discountPrice === null) return total;
    return total + (item.variant.sellingPrice - item.variant.effectivePrice) * item.quantity;
  }, 0);
  const subtotalBeforeDiscount = cart.subtotal + discountTotal;

  return (
    <div className="py-5 sm:py-8">
      <header className="mb-8 border-b border-border pb-6 sm:mb-10 sm:pb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          VibeLock / Cart
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your cart</h1>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"}
            <span className="mx-2 text-border" aria-hidden="true">·</span>
            {cart.items.length} {cart.items.length === 1 ? "product" : "products"}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <section aria-label="Items in your cart" className="min-w-0">
          <div>
            {cart.items.map((item) => (
              <CartItemCard key={item.id} item={item} />
            ))}
          </div>
          <Link
            href="/products"
            className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-sm text-sm font-semibold text-[#101114] underline underline-offset-4 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Continue shopping
          </Link>
        </section>

        <aside aria-labelledby="cart-summary-heading" className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-border bg-[#F3F0E8]/55 p-5 sm:p-6">
            <h2 id="cart-summary-heading" className="border-b border-[#101114]/15 pb-4 text-lg font-semibold tracking-tight">
              Order summary
            </h2>

            <dl className="space-y-4 py-5">
              <div className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium text-[#101114]">{formatPrice(subtotalBeforeDiscount)}</dd>
              </div>
              {discountTotal > 0 && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="font-medium text-[#101114]">−{formatPrice(discountTotal)}</dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-4 text-sm">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="text-right text-muted-foreground">Calculated at checkout</dd>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-4 border-t border-[#101114]/15 pt-4">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-semibold tracking-tight">{formatPrice(cart.subtotal)}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Shipping and any applicable charges are confirmed at checkout.
            </p>

            {requiresAdjustment && (
              <p className="mt-4 border-l-2 border-destructive bg-white/70 px-3 py-2 text-sm text-destructive" role="status">
                Adjust or remove unavailable items before checkout.
              </p>
            )}

            <Link
              href="/checkout"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#101114] px-5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
            >
              Continue to checkout <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
