import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/storefront/catalog/product-card";
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

interface NewArrivalsProps {
  products?: ProductSummary[];
  newArrivals?: ProductSummary[];
}

export function NewArrivals({ products, newArrivals }: NewArrivalsProps) {
  // Use explicit newArrivals or take the latest products from published catalog
  const items = newArrivals ?? (products ?? []).slice(0, 10);

  if (!items.length) return null;

  return (
    <section className="bg-white py-12 sm:py-16">
      <Container>
        <SectionHeading
          eyebrow="EXPLORE THE LINEUP"
          title="NEW ARRIVALS"
          align="center"
          action={{ href: "/products?sort=newest", label: "View All" }}
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {items.map((product) => (
            <ProductCard key={product.id} product={toCardProduct(product)} />
          ))}
        </div>
      </Container>
    </section>
  );
}
