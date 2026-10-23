import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import type { ProductSummary } from "@/lib/catalog/types";

interface BestSellersProps {
  products: ProductSummary[];
}

export function BestSellers({ products }: BestSellersProps) {
  if (products.length === 0) return null;

  const displayed = products; //.slice(0, 10);

  return (
    <section className="bg-white pb-12 sm:pb-16">
      <Container>
        <SectionHeading
          title="BEST SELLERS"
          eyebrow="Top Picks"
          align="center"
          action={{ href: "/products?sort=newest", label: "View All" }}
        />

        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5">
          {displayed.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              badge={product.hasDiscount ? undefined : { label: "HOT", variant: "sale" }}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
