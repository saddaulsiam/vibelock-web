import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import type { ProductSummary } from "@/lib/catalog/types";

interface BestSellersProps {
  products: ProductSummary[];
}

function toCardProduct(product: ProductSummary) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.minPrice,
    originalPrice: product.hasDiscount ? product.maxPrice : undefined,
    image: product.primaryImage?.url ?? "",
    badge: product.hasDiscount
      ? { label: "SALE", variant: "sale" as const }
      : { label: "HOT", variant: "sale" as const },
  };
}

export function BestSellers({ products }: BestSellersProps) {
  if (products.length === 0) return null;

  const displayed = products.slice(0, 8);

  return (
    <section className="border-t border-black/5 bg-white py-12 sm:py-16 lg:py-20">
      <Container>
        <SectionHeading
          title="BEST SELLERS"
          eyebrow="Top Picks"
        />

        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {displayed.map((product, index) => (
            <div key={product.id} className="relative">
              {/* Rank badge */}
              <span
                className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black tabular-nums shadow-md"
                style={{
                  background:
                    index === 0
                      ? "linear-gradient(135deg,#FFB800,#FF6B00)"
                      : index === 1
                        ? "linear-gradient(135deg,#C0C0C0,#808080)"
                        : index === 2
                          ? "linear-gradient(135deg,#CD7F32,#8B4513)"
                          : "#1a1b1e",
                  color: "#fff",
                }}
              >
                {index === 0 ? "🔥" : `#${index + 1}`}
              </span>
              <ProductCard product={toCardProduct(product)} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
