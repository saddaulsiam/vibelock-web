"use client";

import { useTransition } from "react";
import { LoaderCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { addVariantToCartAction } from "@/lib/cart/actions";

interface AddToCartButtonProps {
  variantId: string | null;
  quantity: number;
  isAvailable: boolean;
}

export function AddToCartButton({ variantId, quantity, isAvailable }: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleAddToCart = () => {
    if (!variantId || !isAvailable || isPending) return;

    startTransition(async () => {
      try {
        const result = await addVariantToCartAction(variantId, quantity);
        if (result.success) {
          toast.success("Added to your cart");
        } else {
          toast.error(result.error || "Could not add this item to your cart.");
        }
      } catch {
        toast.error("Could not add this item to your cart. Please try again.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={!variantId || !isAvailable || isPending}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#101114] px-5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <ShoppingBag className="size-4" aria-hidden="true" />
      )}
      {isPending ? "Adding to cart" : !isAvailable ? "Unavailable" : "Add to cart"}
    </button>
  );
}
