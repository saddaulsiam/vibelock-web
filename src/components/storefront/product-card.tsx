"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 transition-transform duration-200 hover:-translate-y-1",
        className
      )}
      {...props}
    >
      <Link
        href={`/product/${product.slug}`}
        className="block relative aspect-[3/4] overflow-hidden bg-secondary/50 rounded-sm"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 768px) 25vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {product.badge && (
          <div className="absolute top-2 left-2 z-10">
            <ProductBadge label={product.badge.label} variant={product.badge.variant} />
          </div>
        )}
      </Link>

      <div className="flex flex-col gap-1">
        <Link
          href={`/product/${product.slug}`}
          className="font-medium truncate hover:underline underline-offset-4"
        >
          {product.name}
        </Link>
        <Price amount={product.price} originalAmount={product.originalPrice} />
      </div>
    </div>
  );
}
