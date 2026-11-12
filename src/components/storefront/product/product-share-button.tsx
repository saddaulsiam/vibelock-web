"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ProductShareButtonProps {
  productName: string;
}

export function ProductShareButton({ productName }: ProductShareButtonProps) {
  const handleShare = async () => {
    if (typeof window === "undefined") return;

    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${productName} | VibeLock`,
          text: `Check out ${productName} on VibeLock.`,
          url,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Product link copied to clipboard!");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleShare}
      className="size-11 sm:size-12 shrink-0 rounded-xs p-0 border-vl-dark-900/15 hover:border-vl-dark-900 hover:bg-vl-white-300/60 text-vl-dark-900 transition-colors"
      title="Share this product"
      aria-label="Share this product"
    >
      <Share2 className="size-4" aria-hidden="true" />
    </Button>
  );
}
