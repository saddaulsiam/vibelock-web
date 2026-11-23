import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import type { ProductSummary } from "@/lib/catalog/types";

interface NewArrivalsProps {
  products?: ProductSummary[];
  newArrivals?: ProductSummary[];
}

export function NewArrivals({ products, newArrivals }: NewArrivalsProps) {
  // Use explicit newArrivals or take the latest products from published catalog
  const allProducts = newArrivals ?? products ?? [];

  // Prioritize in-stock fresh drops while preserving newest-first order
  const inStockItems = allProducts.filter((p) => p.available !== false);
  const outOfStockItems = allProducts.filter((p) => p.available === false);
  const items = [...inStockItems, ...outOfStockItems].slice(0, 10);

  if (!items.length) return null;

  return (
    <section className="bg-white py-12 sm:py-16">
      <Container>
        <SectionHeading
          eyebrow="EXPLORE THE LINEUP"
          title="NEW ARRIVALS"
          align="center"
          action={{ href: "/shop?sort=newest", label: "View All" }}
        />

        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}
