import { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import Link from "next/link";

interface ProductGridProps {
  products: ProductSummary[];
  searchTerm?: string;
  clearSearchHref?: string;
}

export function ProductGrid({
  products,
  searchTerm,
  clearSearchHref = "/products",
}: ProductGridProps) {
  if (products.length === 0) {
    if (searchTerm) {
      return (
        <div className="border-border border border-dashed px-5 py-14 text-center sm:py-20">
          <h2 className="text-xl font-semibold tracking-tight break-words">
            No products matched “{searchTerm}”
          </h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
            Try a different search term, or clear your search to browse the catalog.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={clearSearchHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xs bg-vl-black px-5 font-heading text-sm font-black tracking-widest text-vl-white uppercase transition-colors hover:bg-vl-black/85 focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Clear search
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center border border-vl-black/20 px-5 font-heading text-sm font-black tracking-widest text-vl-black uppercase transition-colors hover:bg-vl-white focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none"
            >
              Browse all products
            </Link>
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
