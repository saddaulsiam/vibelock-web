import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { getFeaturedProducts } from "@/lib/catalog/queries";
import type { ProductSummary } from "@/lib/catalog/types";

export interface FeaturedProductsProps {
  products?: ProductSummary[];
  featuredProducts?: ProductSummary[];
}

export async function FeaturedProducts({ products, featuredProducts }: FeaturedProductsProps = {}) {
  let items = featuredProducts ?? products;
  if (items === undefined) {
    items = await getFeaturedProducts({ take: 10 });
  }

  // Prioritize in-stock drops while preserving featured order
  const inStockItems = items.filter((p) => p.available !== false);
  const outOfStockItems = items.filter((p) => p.available === false);
  const displayItems = [...inStockItems, ...outOfStockItems].slice(0, 10);

  if (!displayItems.length) return null;

  return (
    <section className="bg-white py-12 sm:py-16">
      <Container>
        <SectionHeading
          eyebrow="CURATED DROPS"
          title="Just For You"
          align="center"
          action={{ href: "/shop", label: "View All" }}
        />

        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5">
          {displayItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export default FeaturedProducts;
