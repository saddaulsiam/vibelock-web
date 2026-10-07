import { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "@/components/storefront/product-card";
import Link from "next/link";

interface ProductGridProps {
  products: ProductSummary[];
  searchTerm?: string;
  clearSearchHref?: string;
}

export function ProductGrid({ products, searchTerm, clearSearchHref = "/products" }: ProductGridProps) {
  if (products.length === 0) {
    if (searchTerm) {
      return (
        <div className="border border-dashed border-border px-5 py-14 text-center sm:py-20">
          <h2 className="break-words text-xl font-semibold tracking-tight">
            No products matched “{searchTerm}”
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Try a different search term, or clear your search to browse the catalog.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={clearSearchHref}
              className="inline-flex min-h-11 items-center justify-center bg-[#101114] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
            >
              Clear search
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center border border-[#101114]/20 px-5 text-sm font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              Browse all products
            </Link>
          </div>
        </div>
      );
    }

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
