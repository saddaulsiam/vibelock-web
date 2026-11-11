"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CartItemDTO } from "@/lib/cart/types";
import { removeCartItemAction, updateCartItemAction } from "@/lib/cart/actions";

interface CartItemCardProps {
  item: CartItemDTO;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CartItemCard({ item }: CartItemCardProps) {
  const [isPending, startTransition] = useTransition();
  const [imageFailed, setImageFailed] = useState(false);

  const handleUpdateQuantity = (newQuantity: number) => {
    if (newQuantity < 1 || isPending) return;

    startTransition(async () => {
      const result = await updateCartItemAction(item.id, newQuantity);
      if (result.success) {
        toast.success("Cart quantity updated");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("vibelock:refresh-cart"));
        }
      } else {
        toast.error(result.error || "Could not update this quantity.");
      }
    });
  };

  const handleRemove = () => {
    if (isPending) return;

    startTransition(async () => {
      const result = await removeCartItemAction(item.id);
      if (result.success) {
        toast.success("Item removed from your cart");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("vibelock:refresh-cart"));
        }
      } else {
        toast.error(result.error || "Could not remove this item.");
      }
    });
  };

  const isInsufficient = item.quantity > item.availableQuantity;
  const isUnavailable = !item.variant.available;

  return (
    <article className="border-border group relative flex gap-4 border-b py-6 last:border-b-0 sm:gap-6">
      {/* Product Image Canvas */}
      <Link
        href={`/product/${item.productSlug}`}
        aria-label={`View ${item.productName}`}
        className="border-border bg-vl-white-100 focus-visible:ring-vl-cyan relative aspect-3/4 w-16 shrink-0 overflow-hidden border transition-colors focus-visible:ring-2 focus-visible:outline-none sm:w-20"
      >
        {item.productImage && !imageFailed ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            sizes="(max-width: 640px) 64px, 80px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-vl-dark-400 absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 text-center">
            <ImageOff className="size-5" aria-hidden="true" />
            <span className="text-[10px] font-medium uppercase">No image</span>
          </span>
        )}
      </Link>

      {/* Item Details */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          {/* Title & Price Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${item.productSlug}`}
                className="font-heading text-vl-dark-900 hover:text-vl-cyan focus-visible:ring-vl-cyan line-clamp-1 text-sm font-bold tracking-tight uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none sm:text-base"
                title={item.productName}
              >
                {item.productName}
              </Link>

              {/* Variant Specs (Clean Streetwear Metadata) */}
              <div className="text-vl-dark-500 mt-1 flex flex-wrap items-center gap-2 text-xs font-medium">
                {item.variant.size && <span>Size: {item.variant.size}</span>}
                {item.variant.size && item.variant.color && (
                  <span className="text-vl-dark-300">/</span>
                )}
                {item.variant.color && <span>Color: {item.variant.color}</span>}
                {!isUnavailable && !isInsufficient && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 sm:ml-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    In Stock
                  </span>
                )}
              </div>
            </div>

            {/* Line Price & Unit Strikethrough */}
            <div className="shrink-0 text-right">
              <span
                className="font-heading text-vl-dark-900 text-sm font-bold tracking-tight sm:text-base"
                aria-label={`Line total ${formatPrice(item.lineTotal)}`}
              >
                {formatPrice(item.lineTotal)}
              </span>
              <div className="text-vl-dark-400 mt-0.5 flex items-baseline justify-end gap-1.5 text-xs font-medium">
                {item.quantity > 1 && <span>{formatPrice(item.variant.effectivePrice)} each</span>}
                {item.variant.discountPrice !== null && (
                  <span className="text-[11px] line-through">
                    {formatPrice(item.variant.sellingPrice * item.quantity)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stock Warning */}
          {(isInsufficient || isUnavailable) && (
            <div
              className="mt-2.5 border-l-2 border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800"
              role="status"
            >
              {isInsufficient
                ? item.availableQuantity > 0
                  ? `Only ${item.availableQuantity} available in stock. Adjust quantity to proceed.`
                  : "This item is currently sold out. Please remove to continue."
                : "This item is out of stock. Please remove to continue."}
            </div>
          )}
        </div>

        {/* Quantity Controls & Remove Action Row */}
        <div className="mt-4 flex items-center justify-between gap-3 pt-1">
          {/* Tactile Minimalist Quantity Stepper */}
          <div
            className="border-border flex h-8 items-center border bg-white"
            aria-label={`Quantity for ${item.productName}`}
          >
            <button
              type="button"
              onClick={() => handleUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1 || isPending}
              aria-label={`Decrease ${item.productName} quantity`}
              className="text-vl-dark-700 hover:text-vl-dark-900 hover:bg-vl-white-200 flex size-8 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus className="size-3" aria-hidden="true" />
            </button>
            <span
              className="text-vl-dark-900 min-w-8 text-center font-mono text-xs font-bold"
              aria-live="polite"
            >
              {isPending ? (
                <Loader2
                  className="text-vl-dark-900 mx-auto size-3 animate-spin"
                  aria-label="Updating cart"
                />
              ) : (
                item.quantity
              )}
            </span>
            <button
              type="button"
              onClick={() => handleUpdateQuantity(item.quantity + 1)}
              disabled={
                isPending ||
                item.quantity >= 10 ||
                item.quantity >= item.availableQuantity ||
                isUnavailable
              }
              aria-label={`Increase ${item.productName} quantity`}
              className="text-vl-dark-700 hover:text-vl-dark-900 hover:bg-vl-white-200 flex size-8 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus className="size-3" aria-hidden="true" />
            </button>
          </div>

          {/* Remove Button */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="text-vl-dark-400 group/remove inline-flex cursor-pointer items-center gap-1.5 py-1 text-xs font-semibold tracking-wider uppercase transition-colors hover:text-rose-600 disabled:opacity-50"
            aria-label={`Remove ${item.productName} from cart`}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2
                className="size-3.5 transition-colors group-hover/remove:text-rose-600"
                aria-hidden="true"
              />
            )}
            <span>Remove</span>
          </button>
        </div>
      </div>
    </article>
  );
}
