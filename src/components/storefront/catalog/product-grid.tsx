import { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "@/components/storefront/product-card";

interface ProductGridProps {
  products: ProductSummary[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="border border-dashed border-border px-5 py-20 text-center">
        <h3 className="mb-2 text-xl font-semibold tracking-tight">No products found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or search.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.minPrice,
            originalPrice: product.hasDiscount ? product.maxPrice : undefined,
            image: product.primaryImage?.url ?? "",
            badge: product.hasDiscount ? { label: "Sale", variant: "sale" } : undefined,
          }}
        />
      ))}
    </div>
  );
}
