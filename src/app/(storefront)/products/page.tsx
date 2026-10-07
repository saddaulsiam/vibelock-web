import type { Metadata } from "next";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";
import { DiscoveryPagination } from "@/components/storefront/catalog/pagination";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ProductGrid } from "@/components/storefront/catalog/product-grid";
import { getCategories } from "@/lib/catalog/queries";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { parseDiscoverySearchParams } from "@/lib/catalog/validation";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse VibeLock's latest everyday streetwear and essentials.",
  alternates: { canonical: `${SITE_URL}/products` },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsedParams = parseDiscoverySearchParams(params);

  const [discoveryResult, categories] = await Promise.all([
    getDiscoveredProducts(parsedParams),
    getCategories(),
  ]);

  const filterOptions = {
    categories: categories.map((category) => ({ name: category.name, slug: category.slug })),
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Grey", "Navy", "Red", "Olive"],
  };

  return (
    <Section className="min-h-screen bg-white py-10 sm:py-14 lg:py-16">
      <Container>
        <header className="mb-8 border-b border-border pb-7 sm:mb-10 sm:pb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            VibeLock / Shop
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">All products</h1>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Everyday pieces and easy layers for your city rotation.
            </p>
            <p className="text-sm font-medium text-foreground" aria-live="polite">
              {discoveryResult.totalCount} {discoveryResult.totalCount === 1 ? "product" : "products"}
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <ProductFilters options={filterOptions} />
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-center justify-between gap-4 lg:hidden">
              <ProductFilters options={filterOptions} isMobile />
              <span className="text-sm text-muted-foreground">
                {discoveryResult.totalCount} {discoveryResult.totalCount === 1 ? "item" : "items"}
              </span>
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
