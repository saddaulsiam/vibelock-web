"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, LoaderCircle, Minus, Plus, Trash2 } from "lucide-react";
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
      } else {
        toast.error(result.error || "Could not remove this item.");
      }
    });
  };

  const isInsufficient = item.quantity > item.availableQuantity;
  const isUnavailable = !item.variant.available;

  return (
    <article className="border-border grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-b py-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5 sm:py-6">
      <Link
        href={`/products/${item.productSlug}`}
        aria-label={`View ${item.productName}`}
        className="relative aspect-[3/4] overflow-hidden bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {item.productImage && !imageFailed ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            sizes="(max-width: 640px) 88px, 112px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ImageOff className="size-5" aria-hidden="true" />
            <span className="text-[10px]">Image unavailable</span>
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-col justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:justify-between sm:gap-5">
          <div className="min-w-0">
            <Link
              href={`/products/${item.productSlug}`}
              className="font-heading text-base font-black tracking-tight break-words text-vl-black underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none"
            >
              {item.productName}
            </Link>
            <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {item.variant.size && <span>Size: {item.variant.size}</span>}
              {item.variant.color && <span>Color: {item.variant.color}</span>}
            </div>
            {(isInsufficient || isUnavailable) && (
              <p className="text-destructive mt-2 text-sm font-medium" role="status">
                {isInsufficient
                  ? item.availableQuantity > 0
                    ? `Only ${item.availableQuantity} available. Reduce the quantity to continue.`
                    : "This item is currently unavailable. Remove it to continue."
                  : "This item is out of stock. Remove it to continue."}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-row items-baseline justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
            <span
              className="text-base font-semibold text-[#101114]"
              aria-label={`Line total ${formatPrice(item.lineTotal)}`}
            >
              {formatPrice(item.lineTotal)}
            </span>
            <div className="flex items-baseline gap-2 text-sm">
              <span className="text-muted-foreground">
                {formatPrice(item.variant.effectivePrice)} each
              </span>
              {item.variant.discountPrice !== null && (
                <span className="text-muted-foreground text-xs line-through">
                  {formatPrice(item.variant.sellingPrice)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex h-10 items-center border border-[#101114]/20"
            aria-label={`Quantity for ${item.productName}`}
          >
            <button
              type="button"
              onClick={() => handleUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1 || isPending}
              aria-label={`Decrease ${item.productName} quantity`}
              className="inline-flex size-10 items-center justify-center transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span className="min-w-10 text-center text-sm font-medium" aria-live="polite">
              {isPending ? (
                <LoaderCircle className="mx-auto size-4 animate-spin" aria-label="Updating cart" />
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
              className="inline-flex size-10 items-center justify-center transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive inline-flex min-h-10 items-center gap-2 rounded-sm px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Remove ${item.productName} from cart`}
          >
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}
