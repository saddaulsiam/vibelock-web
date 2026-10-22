import { Container } from "@/components/shared/container";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ProductSummary } from "@/lib/catalog/types";

function toCardProduct(product: ProductSummary) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.minPrice,
    originalPrice: product.hasDiscount ? product.maxPrice : undefined,
    image: product.primaryImage?.url ?? "",
    badge: product.hasDiscount ? { label: "Sale", variant: "sale" as const } : undefined,
  };
}

export function FeaturedProducts({ bestSellers }: { bestSellers: ProductSummary[] }) {
  return (
    <section className="border-t border-black/5 bg-[#F8F7F5] py-12 sm:py-16 lg:py-20">
      <Container>
        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.20em] text-[#00D9FF] uppercase">
              FEATURED PRODUCTS
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-3xl lg:text-4xl">
              BEST SELLERS
            </h2>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:text-[#00D9FF] sm:text-sm"
          >
            <span>View All Products</span>
            <ArrowRight
              className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* 5-Column Grid */}
        {bestSellers.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={toCardProduct(product)} />
            ))}
          </div>
        ) : (
          <div className="border-border text-muted-foreground rounded-sm border border-dashed px-4 py-14 text-center text-sm">
            No products available yet.
          </div>
        )}
      </Container>
    </section>
  );
}
