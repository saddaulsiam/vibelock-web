"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
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
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("group relative flex flex-col gap-3", className)}
      {...props}
    >
      <Link
        href={`/product/${product.slug}`}
        className="block relative aspect-[3/4] overflow-hidden bg-secondary/50 rounded-sm"
      >
        {/* Placeholder for real images. Using a colored div to simulate image loading/structure */}
        <div className="absolute inset-0 bg-muted flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
          <span className="text-muted-foreground/50 font-medium">Image Placeholder</span>
        </div>

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
    </motion.div>
  );
}
