import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import type { ProductSummary } from "@/lib/catalog/types";
import { Button } from "@/components/ui/button";

interface YouMayAlsoLikeProps {
  products: ProductSummary[];
  categorySlug?: string;
  categoryName?: string;
}

export function YouMayAlsoLike({ products, categorySlug, categoryName }: YouMayAlsoLikeProps) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="related-products-heading"
      className="border-border/50 mt-7 border-t pt-5 sm:mt-10 sm:pt-7"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
        <div>
          <span className="text-vl-dark-900/50 tracking-streetwear block text-[10px] font-bold uppercase sm:text-[11px]">
            Curated For You
          </span>
          <h2
            id="related-products-heading"
            className="font-heading text-vl-dark-900 mt-1 text-xl font-black tracking-tight uppercase sm:text-2xl lg:text-3xl"
          >
            You May Also Like
          </h2>
        </div>

        {categorySlug && (
          <Button variant="link" size="sm" asChild>
            <Link
              href={`/category/${categorySlug}`}
              className="group hover:text-vl-cyan inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              <span>View More {categoryName || "Products"}</span>
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
