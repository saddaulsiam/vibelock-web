import { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ProductGridProps {
  products: ProductSummary[];
  searchTerm?: string;
  clearSearchHref?: string;
}

export function ProductGrid({ products, searchTerm, clearSearchHref = "/shop" }: ProductGridProps) {
  if (products.length === 0) {
    if (searchTerm) {
      return (
        <div className="border-border border border-dashed px-5 py-14 text-center sm:py-20">
          <h2 className="text-xl font-semibold tracking-tight wrap-break-word">
            No products matched “{searchTerm}”
          </h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
            Try a different search term, or clear your search to browse the catalog.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={clearSearchHref}>
                Clear search
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/shop">
                Browse all products
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="border-border border border-dashed px-5 py-20 text-center">
        <h3 className="mb-2 text-xl font-semibold tracking-tight">No products found</h3>
        <p className="text-muted-foreground text-sm">Try adjusting your filters or search.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
