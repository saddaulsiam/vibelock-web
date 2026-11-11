import { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  products: ProductSummary[];
  searchTerm?: string;
  clearSearchHref?: string;
  className?: string;
}

export function ProductGrid({
  products,
  searchTerm,
  clearSearchHref = "/shop",
  className,
}: ProductGridProps) {
  if (products.length === 0) {
    if (searchTerm) {
      return (
        <div className="border-vl-dark-200 bg-vl-white-50/60 border border-dashed px-5 py-14 text-center sm:py-20">
          <h2 className="text-vl-dark-900 text-xl font-bold tracking-tight wrap-break-word uppercase">
            No products matched “{searchTerm}”
          </h2>
          <p className="text-vl-dark-400 mx-auto mt-2 max-w-md text-sm leading-6">
            Try a different search term, or clear your search to browse the catalog.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              variant="primary"
              size="default"
              className="rounded-none text-xs font-bold uppercase"
            >
              <Link href={clearSearchHref}>Clear search</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="default"
              className="rounded-none text-xs font-bold uppercase"
            >
              <Link href="/shop">Browse all drops</Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="border-vl-dark-200 bg-vl-white-50/60 border border-dashed px-5 py-20 text-center">
        <h3 className="text-vl-dark-900 mb-2 text-xl font-bold tracking-tight uppercase">
          No drops found
        </h3>
        <p className="text-vl-dark-400 text-sm">
          Try adjusting your filters or price range to find available releases.
        </p>
        <div className="mt-6">
          <Button
            asChild
            variant="primary"
            size="default"
            className="rounded-none text-xs font-bold uppercase"
          >
            <Link href="/shop">Reset Filters</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-3.5 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
