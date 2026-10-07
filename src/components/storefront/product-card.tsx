"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
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
  };
}

export function ProductCard({ product, className, ...props }: ProductCardProps) {
  const [failedImage, setFailedImage] = React.useState<string | null>(null);
  const hasImage = Boolean(product.image) && failedImage !== product.image;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 transition-transform duration-200 hover:-translate-y-1",
        className
      )}
      {...props}
    >
      <Link
        href={`/products/${product.slug}`}
        aria-label={`View ${product.name}`}
        className="relative block aspect-[3/4] overflow-hidden rounded-sm bg-secondary/50"
      >
        {hasImage ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setFailedImage(product.image)}
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F3F0E8] text-muted-foreground">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs">Image unavailable</span>
          </span>
        )}

        {product.badge && (
          <div className="absolute top-2 left-2 z-10">
            <ProductBadge label={product.badge.label} variant={product.badge.variant} />
          </div>
        )}
      </Link>

      <div className="flex flex-col gap-1">
        <Link
          href={`/products/${product.slug}`}
          className="font-medium truncate hover:underline underline-offset-4"
        >
          {product.name}
        </Link>
        <Price amount={product.price} originalAmount={product.originalPrice} />
      </div>
    </div>
  );
}
