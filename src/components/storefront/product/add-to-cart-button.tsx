"use client";

import { useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { addVariantToCartAction } from "@/lib/cart/actions";
import { Button } from "@/components/ui/button";

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
      variant="brand"
      size="lg"
      fullWidth
      onClick={handleAddToCart}
      disabled={!variantId || !isAvailable || isPending}
      loading={isPending}
    >
      {!isPending && <ShoppingBag className="size-4" aria-hidden="true" />}
      {isPending ? "Adding to cart" : !isAvailable ? "Unavailable" : "Add to cart"}
    </Button>
  );
}
