import { Container } from "@/components/shared/container";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import type { ProductSummary } from "@/lib/catalog/types";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

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

export function NewArrivals({ moreArrivals }: { moreArrivals: ProductSummary[] }) {
  return (
    <>
      {moreArrivals.length > 0 && (
        <section className="bg-white py-12 sm:py-16">
          <Container>
            <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.20em] text-[#00D9FF] uppercase">
                  EXPLORE THE LINEUP
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-3xl">
                  NEW ARRIVALS
                </h2>
              </div>
              <Link
                href="/products?sort=newest"
                className="group inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:text-[#00D9FF] sm:text-sm"
              >
                <span>Shop New Drops</span>
                <ArrowRight
                  className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
              {moreArrivals.map((product) => (
                <ProductCard key={product.id} product={toCardProduct(product)} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
