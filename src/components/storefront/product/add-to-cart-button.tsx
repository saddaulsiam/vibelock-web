"use client";

import { useTransition } from "react";
import { addVariantToCartAction } from "@/lib/cart/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddToCartButtonProps {
  variantId: string | null;
  isAvailable: boolean;
}

export function AddToCartButton({ variantId, isAvailable }: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleAddToCart = () => {
    if (!variantId || !isAvailable) return;

    startTransition(async () => {
      const res = await addVariantToCartAction(variantId, 1);
      if (res.success) {
        toast.success("Item has been successfully added to your cart.");
      } else {
        toast.error(res.error || "An unexpected error occurred.");
      }
    });
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={!variantId || !isAvailable || isPending}
      className="w-full py-4 rounded-xl font-bold uppercase tracking-wider bg-brand-charcoal text-white hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
      {!isAvailable ? "Out of Stock" : isPending ? "Adding..." : "Add to Cart"}
    </button>
  );
}
