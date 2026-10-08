import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";
import { DiscoveryPagination } from "@/components/storefront/catalog/pagination";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ProductGrid } from "@/components/storefront/catalog/product-grid";
import { getCategories, getCatalogFilterOptions } from "@/lib/catalog/queries";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { parseDiscoverySearchParams } from "@/lib/catalog/validation";
import { SITE_URL } from "@/lib/seo/site";

function getClearSearchHref(params: ReturnType<typeof parseDiscoverySearchParams>) {
  const retained = new URLSearchParams();
  if (params.category) retained.set("category", params.category);
  if (params.size) retained.set("size", params.size);
  if (params.color) retained.set("color", params.color);
  if (params.minPrice !== undefined) retained.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) retained.set("maxPrice", String(params.maxPrice));
  if (params.sort !== "newest") retained.set("sort", params.sort);
  const query = retained.toString();
  return query ? `/products?${query}` : "/products";
}

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

  const [discoveryResult, categories, filterOptionsData] = await Promise.all([
    getDiscoveredProducts(parsedParams),
    getCategories(),
    getCatalogFilterOptions(),
  ]);
  const hasSearch = Boolean(parsedParams.q?.trim());
  const searchTerm = parsedParams.q?.trim() ?? "";
  const clearSearchHref = getClearSearchHref(parsedParams);

  const filterOptions = {
    categories: categories.map((category) => ({ name: category.name, slug: category.slug })),
    ...filterOptionsData,
  };

  return (
    <Section className="min-h-screen bg-white py-10 sm:py-14 lg:py-16">
      <Container>
        <header className="mb-8 border-b border-border pb-7 sm:mb-10 sm:pb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {hasSearch ? "VibeLock / Search" : "VibeLock / Shop"}
          </p>
          <h1 className="break-words text-4xl font-semibold tracking-tight sm:text-5xl">
            {hasSearch ? "Search results" : "All products"}
          </h1>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {hasSearch ? (
              <p className="max-w-2xl break-words text-sm leading-6 text-muted-foreground sm:text-base">
                Results for <span className="font-medium text-[#101114]">“{searchTerm}”</span>
              </p>
            ) : (
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Everyday pieces and easy layers for your city rotation.
              </p>
            )}
            <p className="text-sm font-medium text-foreground" aria-live="polite">
              {discoveryResult.totalCount} {discoveryResult.totalCount === 1 ? "product" : "products"}
            </p>
          </div>
          {hasSearch && (
            <Link
              href={clearSearchHref}
              className="mt-4 inline-flex min-h-10 items-center justify-center border border-[#101114]/20 px-4 text-sm font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              Clear search
            </Link>
          )}
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
            <ProductGrid
              products={discoveryResult.products}
              searchTerm={hasSearch ? searchTerm : undefined}
              clearSearchHref={clearSearchHref}
            />
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
