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
      className="h-11 sm:h-12 px-3 sm:px-6 rounded-xs text-[11px] sm:text-xs font-black tracking-wider"
    >
      {!isPending && <Zap className="text-vl-cyan fill-vl-cyan size-3.5" aria-hidden="true" />}
      {isPending ? "Directing to Checkout..." : "Instant Buy Now"}
    </Button>
  );
}
