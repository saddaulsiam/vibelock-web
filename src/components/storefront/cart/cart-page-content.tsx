"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { CartDTO } from "@/lib/cart/types";
import { Button } from "@/components/ui/button";
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
      <div className="flex min-h-[50vh] flex-col items-center justify-center py-12 text-center">
        <div className="border-border bg-vl-white-200 mb-6 flex size-16 items-center justify-center rounded-full border">
          <ShoppingBag className="text-vl-dark-400 size-7" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-vl-dark-900 text-2xl font-black tracking-tight uppercase sm:text-3xl">
          Your cart is empty
        </h1>
        <p className="text-vl-dark-400 mt-2 max-w-sm text-xs leading-relaxed sm:text-sm">
          Take a look through the collection and find your next everyday piece.
        </p>
        <Button
          asChild
          size="default"
          className="mt-6 rounded-none px-6 text-xs font-bold tracking-wider uppercase"
        >
          <Link href="/shop">
            Shop products <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
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
    <div>
      {/* ── Clean & Minimal Top Bar ── */}
      <div className="border-border mb-6 flex items-baseline justify-between border-b pb-4 sm:mb-8">
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-heading text-vl-dark-900 text-xl font-bold tracking-tight uppercase sm:text-2xl">
            Your Cart
          </h1>
          <span className="text-vl-dark-500 font-mono text-xs font-semibold">
            ({cart.totalQuantity})
          </span>
        </div>

        <Link
          href="/shop"
          className="text-vl-dark-600 hover:text-vl-dark-900 group inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase transition-colors"
        >
          <ArrowLeft
            className="size-3.5 transition-transform group-hover:-translate-x-1"
            aria-hidden="true"
          />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12 xl:gap-14">
        {/* Left Column: Items List */}
        <section aria-label="Items in your cart" className="min-w-0">
          {cart.items.map((item) => (
            <CartItemCard key={item.id} item={item} />
          ))}
        </section>

        {/* Right Column: Premium Order Summary Card */}
        <aside
          aria-labelledby="cart-summary-heading"
          className="min-w-0 lg:sticky lg:top-24 lg:self-start"
        >
          <div className="border-border bg-background rounded-xs border p-5 sm:p-6">
            {/* Summary Header */}
            <div className="border-border flex items-center justify-between border-b pb-2.5">
              <h2
                id="cart-summary-heading"
                aria-label="Order summary"
                className="font-heading text-vl-black text-lg font-black tracking-wide uppercase"
              >
                Order Summary
              </h2>
              <span className="text-vl-dark-500 font-mono text-[11px] font-bold">
                {cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Price Breakdown */}
            <dl className="space-y-3.5 py-5 text-xs sm:text-sm">
              <div className="text-vl-dark-600 flex items-center justify-between">
                <dt>Subtotal</dt>
                <dd className="text-vl-dark-900 font-semibold">
                  {formatPrice(subtotalBeforeDiscount)}
                </dd>
              </div>
              {discountTotal > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <dt className="font-medium">Discount</dt>
                  <dd className="font-bold">−{formatPrice(discountTotal)}</dd>
                </div>
              )}
              <div className="text-vl-dark-600 flex items-center justify-between">
                <dt>Shipping</dt>
                <dd className="text-vl-dark-500 text-xs font-medium whitespace-nowrap">
                  Calculated at checkout
                </dd>
              </div>
            </dl>

            {/* Total Row */}
            <div className="border-border border-t pt-2.5">
              <div className="flex items-baseline justify-between">
                <span className="font-heading text-vl-dark-900 text-sm font-bold tracking-wider uppercase">
                  Total
                </span>
                <span className="font-heading text-vl-dark-900 text-2xl font-black tracking-tight">
                  {formatPrice(cart.subtotal)}
                </span>
              </div>
            </div>

            {/* Adjustment Warning */}
            {requiresAdjustment && (
              <div
                className="mt-4 border-l-2 border-rose-400 bg-rose-50 p-3 text-xs font-semibold text-rose-800"
                role="status"
              >
                Adjust or remove unavailable items before checkout.
              </div>
            )}

            {/* Primary Checkout CTA */}
            <Button
              asChild
              size="lg"
              fullWidth
              className="mt-5 h-12 text-xs font-black tracking-widest"
              disabled={requiresAdjustment}
            >
              <Link href="/checkout" className="flex items-center justify-center gap-2">
                <span>Continue to checkout</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>

            {/* Cash on Delivery Badge (Clean single-line pill) */}
            <div className="mt-3.5 flex items-center justify-center gap-1.5 border border-emerald-300 bg-emerald-50/80 px-1.5 py-1 text-[11px] font-semibold text-emerald-800">
              <Truck className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span className="whitespace-nowrap">
                Cash on Delivery Available Across Bangladesh
              </span>
            </div>

            {/* Trust Micro-Features (Industry Standard Streetwear Ecom) */}
            <div className="text-vl-dark-500 border-border mt-3.5 space-y-1.25 border-t pt-2.5 text-[11px]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-vl-dark-400 size-3.5 shrink-0" aria-hidden="true" />
                <span>100% Authentic drops guaranteed</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="text-vl-dark-400 size-3.5 shrink-0" aria-hidden="true" />
                <span>Express nationwide delivery with live tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="text-vl-dark-400 size-3.5 shrink-0" aria-hidden="true" />
                <span>3-day easy size exchange support</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
