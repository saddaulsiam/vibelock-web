import { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "@/components/storefront/product-card";

interface ProductGridProps {
  products: ProductSummary[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-24 text-center border-2 border-dashed rounded-xl">
        <h3 className="text-xl font-bold tracking-tight mb-2">No products found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.minPrice,
            originalPrice: product.hasDiscount ? product.maxPrice : undefined,
            image: product.primaryImage?.url || "/placeholder.jpg",
            badge: product.hasDiscount ? { label: "Sale", variant: "sale" } : undefined,
          }}
        />
      ))}
    </div>
  );
}
