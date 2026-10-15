"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { ProductBadge } from "./product-badge";

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

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2.5 transition-transform duration-200 hover:-translate-y-1",
        className
      )}
      {...props}
    >
      <div className="relative block aspect-square sm:aspect-[4/5] overflow-hidden rounded-xs bg-[#F0EDE7]">
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
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F0EDE7] text-muted-foreground">
              <ImageOff className="size-6 text-[#101114]/30" aria-hidden="true" />
              <span className="text-[11px] font-medium text-[#101114]/50">Image unavailable</span>
            </span>
          )}
        </Link>

        {product.badge && (
          <div className="absolute left-2 top-2 z-10 pointer-events-none">
            <ProductBadge label={product.badge.label} variant={product.badge.variant} />
          </div>
        )}

        {/* Floating Wishlist Heart */}
        <Link
          href="/wishlist"
          aria-label={`Add ${product.name} to wishlist`}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-white/90 text-[#101114]/70 shadow-xs backdrop-blur-xs transition-all hover:bg-white hover:text-[#00D9FF] hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
        >
          <Heart className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col gap-0.5">
        <Link
          href={`/products/${product.slug}`}
          className="truncate text-xs font-semibold text-[#101114] hover:underline underline-offset-4 sm:text-sm"
        >
          {product.name}
        </Link>
        <div className="text-xs font-bold text-[#101114] sm:text-sm">
          <Price amount={product.price} originalAmount={product.originalPrice} />
        </div>
      </div>
    </div>
  );
}
