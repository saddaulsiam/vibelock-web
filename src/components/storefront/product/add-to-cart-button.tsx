"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { addVariantToCartAction } from "@/lib/cart/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  variantId: string | null;
  quantity: number;
  isAvailable: boolean;
}

export function AddToCartButton({ variantId, quantity, isAvailable }: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAddToCart = () => {
    if (!variantId || !isAvailable || isPending) return;

    startTransition(async () => {
      try {
        const result = await addVariantToCartAction(variantId, quantity);
        if (result.success) {
          setIsSuccess(true);
          toast.success("Added to your cart");

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            setIsSuccess(false);
          }, 1800);

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("vibelock:open-cart"));
          }
        } else {
          toast.error(result.error || "Could not add this item to your cart.");
        }
      } catch {
        toast.error("Could not add this item to your cart. Please try again.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant={isSuccess ? "outline" : "brand"}
      size="lg"
      fullWidth
      onClick={handleAddToCart}
      disabled={!variantId || !isAvailable || isPending}
      loading={isPending}
      className={cn(
        "h-11 rounded-xs px-3 text-[11px] font-black tracking-wider transition-all duration-300 active:scale-[0.98] sm:h-12 sm:px-6 sm:text-xs",
        isSuccess &&
          "border-vl-cyan bg-vl-dark-900 text-vl-cyan ring-vl-cyan/40 shadow-[0_0_20px_rgba(0,217,255,0.4)] ring-2"
      )}
    >
      {!isPending && isSuccess ? (
        <Check
          className="text-vl-cyan animate-in zoom-in-50 size-4 duration-200"
          aria-hidden="true"
        />
      ) : !isPending ? (
        <ShoppingBag className="size-4" aria-hidden="true" />
      ) : null}
      {isPending
        ? "Adding to cart..."
        : isSuccess
          ? "ADDED TO CART"
          : !isAvailable
            ? "Unavailable"
            : "Add to cart"}
    </Button>
  );
}
