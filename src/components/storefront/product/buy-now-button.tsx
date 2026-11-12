"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { addVariantToCartAction } from "@/lib/cart/actions";
import { Button } from "@/components/ui/button";

interface BuyNowButtonProps {
  variantId: string | null;
  quantity: number;
  isAvailable: boolean;
}

export function BuyNowButton({ variantId, quantity, isAvailable }: BuyNowButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleBuyNow = () => {
    if (!variantId || !isAvailable || isPending) return;

    startTransition(async () => {
      try {
        const result = await addVariantToCartAction(variantId, quantity);
        if (result.success) {
          router.push("/checkout");
        } else {
          toast.error(result.error || "Could not proceed to checkout.");
        }
      } catch {
        toast.error("Could not proceed to checkout. Please try again.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="primary"
      size="lg"
      fullWidth
      onClick={handleBuyNow}
      disabled={!variantId || !isAvailable || isPending}
      loading={isPending}
      className="h-12 border-vl-dark-900 bg-vl-dark-900 font-bold text-white hover:bg-vl-dark-900/90 active:scale-[0.99] shadow-xs"
    >
      {!isPending && <Zap className="size-4 text-vl-cyan fill-vl-cyan" aria-hidden="true" />}
      {isPending ? "Directing to Checkout..." : "Instant Buy Now"}
    </Button>
  );
}

