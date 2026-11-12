"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ImageOff,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { fetchCartAction, removeCartItemAction, updateCartItemAction } from "@/lib/cart/actions";
import type { CartDTO, CartItemDTO } from "@/lib/cart/types";
import { cn } from "@/lib/utils";

interface CartSheetProps {
  initialCart: CartDTO | null;
  triggerClassName?: string;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CartDrawer({ initialCart, triggerClassName }: CartSheetProps) {
  const [open, setOpen] = React.useState(false);
  const [cart, setCart] = React.useState<CartDTO | null>(initialCart);
  const [isUpdatingId, setIsUpdatingId] = React.useState<string | null>(null);

  // Sync if initialCart changes from server re-renders
  const [prevInitialCart, setPrevInitialCart] = React.useState(initialCart);
  if (prevInitialCart !== initialCart) {
    setPrevInitialCart(initialCart);
    setCart(initialCart);
  }

  // Refresh cart from server
  const refreshCart = React.useCallback(async () => {
    try {
      const res = await fetchCartAction();
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (error) {
      console.error("[CartSheet] Failed to refresh cart:", error);
    }
  }, []);

  // Listen for global custom events (e.g. from AddToCartButton)
  React.useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      refreshCart();
    };
    const handleRefresh = () => {
      refreshCart();
    };

    window.addEventListener("vibelock:open-cart", handleOpen);
    window.addEventListener("vibelock:refresh-cart", handleRefresh);

    return () => {
      window.removeEventListener("vibelock:open-cart", handleOpen);
      window.removeEventListener("vibelock:refresh-cart", handleRefresh);
    };
  }, [refreshCart]);

  // When drawer opens, do a fresh background fetch
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      refreshCart();
    }
  };

  const handleUpdateQuantity = async (item: CartItemDTO, newQuantity: number) => {
    if (newQuantity < 1 || isUpdatingId === item.id) return;
    setIsUpdatingId(item.id);

    try {
      const res = await updateCartItemAction(item.id, newQuantity);
      if (res.success && res.cart) {
        setCart(res.cart);
        toast.success("Cart updated");
      } else {
        toast.error(res.error || "Could not update quantity");
      }
    } catch {
      toast.error("Could not update quantity. Please try again.");
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleRemoveItem = async (item: CartItemDTO) => {
    if (isUpdatingId === item.id) return;
    setIsUpdatingId(item.id);

    try {
      const res = await removeCartItemAction(item.id);
      if (res.success && res.cart) {
        setCart(res.cart);
        toast.success("Item removed from cart");
      } else {
        toast.error(res.error || "Could not remove item");
      }
    } catch {
      toast.error("Could not remove item. Please try again.");
    } finally {
      setIsUpdatingId(null);
    }
  };

  const itemCount = cart?.totalQuantity ?? 0;
  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        aria-label={itemCount > 0 ? `Shopping bag, ${itemCount} items` : "Shopping bag"}
        className={cn(
          "hover:text-vl-cyan text-vl-white/75 hover:bg-vl-white/10 focus-visible:ring-vl-cyan relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-9",
          triggerClassName
        )}
      >
        <ShoppingBag className="size-4 sm:size-4.5" aria-hidden="true" />
        {itemCount > 0 && (
          <span className="bg-vl-cyan text-vl-black absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full text-[8px] font-black sm:top-1 sm:right-1 sm:size-4 sm:text-[9px]">
            {itemCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="border-border flex h-full w-full flex-col gap-0 border-l bg-white p-0 shadow-2xl"
      >
        {/* ── Top Header ── */}
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-vl-dark-900 size-4.5" aria-hidden="true" />
            <SheetTitle className="font-heading text-vl-dark-900 text-sm font-bold tracking-wider uppercase">
              YOUR CART
            </SheetTitle>
            {itemCount > 0 && (
              <span className="bg-vl-dark-900 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close cart drawer"
            className="text-vl-dark-400 hover:text-vl-dark-900 hover:bg-vl-dark-100 flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Cart Body (Scrollable items or empty state) ── */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="border-border bg-vl-white-200 mb-4 flex size-16 items-center justify-center rounded-full border">
              <ShoppingBag className="text-vl-dark-400 size-7" aria-hidden="true" />
            </div>
            <h3 className="font-heading text-vl-dark-900 text-base font-bold tracking-tight uppercase">
              Your cart is empty
            </h3>
            <p className="text-vl-dark-400 mt-1.5 max-w-xs text-xs leading-5">
              Looks like you haven&apos;t added any drops to your bag yet.
            </p>
            <Button
              asChild
              variant="primary"
              size="default"
              onClick={() => setOpen(false)}
              className="bg-vl-dark-900 text-vl-white-50 hover:bg-vl-dark-800 mt-6 rounded-none px-6 text-xs font-bold tracking-wider uppercase"
            >
              <Link href="/shop">
                Explore Releases <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="vibelock-scrollbar divide-vl-dark-100 flex-1 divide-y overflow-y-auto px-5 py-2">
            {items.map((item) => {
              const isItemBusy = isUpdatingId === item.id;
              const isInsufficient = item.quantity > item.availableQuantity;
              const isUnavailable = !item.variant.available;

              return (
                <div key={item.id} className="flex items-start gap-4 py-4">
                  {/* Thumbnail */}
                  <Link
                    href={`/product/${item.productSlug}`}
                    onClick={() => setOpen(false)}
                    className="border-border bg-vl-white-100 relative aspect-3/4 w-16 shrink-0 overflow-hidden border sm:w-20"
                  >
                    {item.productImage ? (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        sizes="(max-width: 640px) 64px, 80px"
                        className="object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-slate-300">
                        <ImageOff className="size-5" />
                      </div>
                    )}
                  </Link>

                  {/* Info Column */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                    <div>
                      <Link
                        href={`/product/${item.productSlug}`}
                        onClick={() => setOpen(false)}
                        className="font-heading text-vl-dark-900 hover:text-vl-cyan line-clamp-1 text-xs font-bold uppercase transition-colors"
                        title={item.productName}
                      >
                        {item.productName}
                      </Link>

                      {/* Variant Specs */}
                      <div className="text-vl-dark-400 mt-0.5 text-xs font-normal">
                        {item.variant.size && <span>Size: {item.variant.size}</span>}
                        {item.variant.size && item.variant.color && <span> · </span>}
                        {item.variant.color && <span>Color: {item.variant.color}</span>}
                      </div>

                      {/* Price */}
                      <p className="font-heading text-vl-dark-900 mt-1 text-xs font-bold sm:text-sm">
                        {formatPrice(item.lineTotal)}
                      </p>

                      {/* Stock Warning */}
                      {(isInsufficient || isUnavailable) && (
                        <p className="mt-1 text-[10px] font-bold text-rose-600">
                          {isUnavailable ? "Out of stock" : `Only ${item.availableQuantity} left`}
                        </p>
                      )}
                    </div>

                    {/* Stepper + Trash Row (exact match to screenshot) */}
                    <div className="mt-3 flex items-center justify-between">
                      {/* Stepper Quantity Controls */}
                      <div className="border-border flex h-7 items-center border bg-white">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                          disabled={item.quantity <= 1 || isItemBusy}
                          aria-label="Decrease quantity"
                          className="text-vl-dark-700 hover:text-vl-dark-900 hover:bg-vl-white-200 flex size-7 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="text-vl-dark-900 min-w-7 text-center font-mono text-xs font-bold">
                          {isItemBusy ? (
                            <Loader2 className="text-vl-dark-900 mx-auto size-3 animate-spin" />
                          ) : (
                            item.quantity
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                          disabled={item.quantity >= item.availableQuantity || isItemBusy}
                          aria-label="Increase quantity"
                          className="text-vl-dark-700 hover:text-vl-dark-900 hover:bg-vl-white-200 flex size-7 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      {/* Trash Button Aligned on Right */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item)}
                        disabled={isItemBusy}
                        aria-label={`Remove ${item.productName}`}
                        className="text-vl-dark-400 cursor-pointer p-1 transition-colors hover:text-rose-600 focus-visible:outline-none disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Sticky Bottom Footer (Matching User Screenshot 1:1) ── */}
        {items.length > 0 && (
          <div className="border-border mt-auto border-t bg-white p-5 sm:p-6">
            {/* Subtotal */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-vl-dark-600 text-sm font-bold tracking-wider uppercase">
                SUBTOTAL
              </span>
              <span className="font-heading text-vl-dark-900 text-base font-black tracking-tight sm:text-xl">
                {formatPrice(subtotal)}
              </span>
            </div>

            {/* Note */}
            <p className="text-vl-dark-400 mb-3 text-[11px] leading-relaxed">
              Shipping & taxes calculated at checkout.
            </p>

            {/* Cash on Delivery Badge Pill */}
            <div className="mb-4 inline-flex w-full items-center gap-1.5 rounded-sm border border-emerald-300 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <Truck className="size-3 shrink-0 text-emerald-600" aria-hidden="true" />
              <span> Cash on Delivery Available Across Bangladesh</span>
            </div>

            {/* Primary Checkout CTA Button */}
            <Button asChild variant="primary" size="lg" fullWidth>
              <Link href="/checkout" onClick={() => setOpen(false)}>
                PROCEED TO CHECKOUT
              </Link>
            </Button>

            {/* View Full Cart Link */}
            <Button
              variant="link"
              fullWidth
              // size="xl"
              className="text-vl-dark-500 hover:text-vl-dark-900 mt-2.5 text-center text-[11px] font-bold tracking-wider uppercase underline underline-offset-4 transition-colors"
            >
              <Link href="/cart" onClick={() => setOpen(false)}>
                View Full Shopping Bag
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
