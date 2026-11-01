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
      className="font-heading bg-vl-black text-vl-white focus-visible:ring-vl-cyan flex min-h-12 w-full items-center justify-center gap-2 rounded-xs px-5 text-xs font-black tracking-widest uppercase transition-all hover:bg-black hover:shadow-[0_0_20px_rgba(0,217,255,0.25)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
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
