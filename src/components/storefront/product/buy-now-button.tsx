"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { addVariantToCartAction } from "@/lib/cart/actions";
import { trackMetaPixelEvent } from "@/lib/analytics/meta-pixel";
import { Button } from "@/components/ui/button";

interface BuyNowButtonProps {
  variantId: string | null;
  quantity: number;
  isAvailable: boolean;
  productName?: string;
  unitPrice?: number;
}

export function BuyNowButton({
  variantId,
  quantity,
  isAvailable,
  productName,
  unitPrice,
}: BuyNowButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleBuyNow = () => {
    if (!variantId || !isAvailable || isPending) return;

    startTransition(async () => {
      try {
        const result = await addVariantToCartAction(variantId, quantity);
        if (result.success) {
          // Track Meta Pixel AddToCart on Buy Now trigger
          trackMetaPixelEvent(
            "AddToCart",
            {
              content_ids: [variantId],
              content_name: productName,
              content_type: "product",
              value: (unitPrice || 0) * quantity,
              currency: "BDT",
              num_items: quantity,
            },
            {
              eventID: `cart_${variantId}_${Date.now()}`,
            }
          );

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
      className="h-11 rounded-xs px-3 text-[11px] font-black tracking-wider sm:h-12 sm:px-6 sm:text-xs"
    >
      {!isPending && <Zap className="text-vl-cyan fill-vl-cyan size-3.5" aria-hidden="true" />}
      {isPending ? "Directing to Checkout..." : "Instant Buy Now"}
    </Button>
  );
}
