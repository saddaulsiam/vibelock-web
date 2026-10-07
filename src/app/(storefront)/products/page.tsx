import { Metadata } from "next";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { parseDiscoverySearchParams } from "@/lib/catalog/validation";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { getCategories } from "@/lib/catalog/queries";
import { ProductGrid } from "@/components/storefront/catalog/product-grid";
import { DiscoveryPagination } from "@/components/storefront/catalog/pagination";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse our complete collection of premium urban streetwear.",
  alternates: { canonical: `${SITE_URL}/products` },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsedParams = parseDiscoverySearchParams(params);

  // Fetch data in parallel
  const [discoveryResult, categories] = await Promise.all([
    getDiscoveredProducts(parsedParams),
    getCategories(),
  ]);

  // Aggregate filter options - categories come from DB, sizes/colors could be hardcoded or extracted from variants.
  // For Phase 3C, we'll provide common sizing and color options. Ideally, these would also be aggregated from DB.
  const filterOptions = {
    categories: categories.map((c) => ({ name: c.name, slug: c.slug })),
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Grey", "Navy", "Red", "Olive"],
  };

  return (
    <Section className="py-12 bg-background min-h-screen">
      <Container>
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">All Products</h1>
          <p className="text-muted-foreground">
            {discoveryResult.totalCount} {discoveryResult.totalCount === 1 ? "product" : "products"}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters */}
          <ProductFilters options={filterOptions} />

          <div className="flex-1">
            <div className="mb-6 lg:hidden">
              {/* Mobile Filters Trigger */}
              <ProductFilters options={filterOptions} isMobile />
            </div>

            <ActiveFilters />

            <ProductGrid products={discoveryResult.products} />

            <DiscoveryPagination
              currentPage={discoveryResult.currentPage}
              totalPages={discoveryResult.totalPages}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
