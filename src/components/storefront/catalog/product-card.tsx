"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { ProductBadge } from "./product-badge";
import {
  subscribeWishlist,
  getWishlistSnapshot,
  getWishlistServerSnapshot,
  toggleWishlistSlug,
} from "@/lib/wishlist";
import { toast } from "sonner";

interface ProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    originalPrice?: number;
    image: string;
    badge?: {
      label: string;
      variant: "default" | "sale" | "new";
    };
    rating?: number;
    reviewCount?: number;
  };
}

export function ProductCard({ product, className, ...props }: ProductCardProps) {
  const [failedImage, setFailedImage] = React.useState<string | null>(null);
  const hasImage = Boolean(product.image) && failedImage !== product.image;

  const rawWishlist = React.useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );

  const isWishlisted = React.useMemo(() => {
    try {
      const list = JSON.parse(rawWishlist);
      return Array.isArray(list) && list.includes(product.slug);
    } catch {
      return false;
    }
  }, [rawWishlist, product.slug]);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isNowAdded = toggleWishlistSlug(product.slug);
    if (isNowAdded) {
      toast.success(`Saved "${product.name}" to wishlist`);
    } else {
      toast.info(`Removed "${product.name}" from wishlist`);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2.5 transition-transform duration-200 hover:-translate-y-1",
        className
      )}
      {...props}
    >
      <div className="relative block aspect-square overflow-hidden rounded-xs bg-[#F0EDE7] sm:aspect-[4/5]">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`View ${product.name}`}
          className="absolute inset-0 block"
        >
          {hasImage ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setFailedImage(product.image)}
            />
          ) : (
            <span className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F0EDE7]">
              <ImageOff className="size-6 text-[#101114]/30" aria-hidden="true" />
              <span className="text-[11px] font-medium text-[#101114]/50">Image unavailable</span>
            </span>
          )}
        </Link>

        {product.badge && (
          <div className="pointer-events-none absolute top-2 left-2 z-10">
            <ProductBadge label={product.badge.label} variant={product.badge.variant} />
          </div>
        )}

        {/* Floating Wishlist Heart */}
        <button
          type="button"
          aria-label={
            isWishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          onClick={handleWishlistToggle}
          className={cn(
            "absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full shadow-xs backdrop-blur-xs transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none",
            isWishlisted
              ? "scale-105 bg-white text-rose-500"
              : "bg-white/90 text-[#101114]/70 hover:bg-white hover:text-[#00D9FF]"
          )}
        >
          <Heart
            className={cn(
              "size-3.5 transition-colors",
              isWishlisted && "fill-rose-500 text-rose-500"
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        <Link
          href={`/products/${product.slug}`}
          className="font-heading truncate text-xs font-bold tracking-tight text-vl-black underline-offset-4 transition-colors hover:text-vl-cyan sm:text-sm"
        >
          {product.name}
        </Link>
        <div className="text-xs font-bold text-vl-black sm:text-sm">
          <Price amount={product.price} originalAmount={product.originalPrice} />
        </div>
      </div>
    </div>
  );
}
