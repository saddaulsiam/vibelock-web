"use client";

import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import {
  getWishlistSnapshot,
  getWishlistServerSnapshot,
  subscribeWishlist,
  toggleWishlistSlug,
} from "@/lib/wishlist";
import { Button } from "@/components/ui/button";

interface ProductWishlistButtonProps {
  productSlug: string;
  productName: string;
}

export function ProductWishlistButton({ productSlug, productName }: ProductWishlistButtonProps) {
  const rawList = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );

  const isFavorited = (() => {
    try {
      const list: string[] = JSON.parse(rawList);
      return Array.isArray(list) && list.includes(productSlug);
    } catch {
      return false;
    }
  })();

  const handleToggle = () => {
    const isNowAdded = toggleWishlistSlug(productSlug);
    if (isNowAdded) {
      toast.success(`Saved "${productName}" to wishlist`);
    } else {
      toast.info(`Removed "${productName}" from wishlist`);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleToggle}
      className={`size-12 shrink-0 border-vl-dark-900/20 rounded-brand p-0 transition-all ${
        isFavorited
          ? "border-rose-500 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30"
          : "hover:border-vl-dark-900 hover:bg-vl-white-300/60 text-vl-dark-900"
      }`}
      title={isFavorited ? "Remove from wishlist" : "Save to wishlist"}
      aria-label={isFavorited ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={isFavorited}
    >
      <Heart
        className={`size-5 transition-transform duration-200 active:scale-125 ${
          isFavorited ? "fill-rose-500 text-rose-500" : "text-vl-dark-900"
        }`}
      />
    </Button>
  );
}

