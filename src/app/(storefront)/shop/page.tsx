import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";
import { CatalogSort } from "@/components/storefront/catalog/catalog-sort";
import { DiscoveryPagination } from "@/components/storefront/catalog/pagination";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ProductGrid } from "@/components/storefront/catalog/product-grid";
import { PromoBanner } from "@/components/storefront/catalog/promo-banner";
import { getSearchPromoBanner } from "@/lib/catalog/banners";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { getCatalogFilterOptions, getCategories } from "@/lib/catalog/queries";
import { parseDiscoverySearchParams } from "@/lib/catalog/validation";
import { SITE_URL } from "@/lib/seo/site";
import type { Metadata } from "next";

function getClearSearchHref(params: ReturnType<typeof parseDiscoverySearchParams>) {
  const retained = new URLSearchParams();
  if (params.category) retained.set("category", params.category);
  if (params.size) retained.set("size", params.size);
  if (params.color) retained.set("color", params.color);
  if (params.minPrice !== undefined) retained.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) retained.set("maxPrice", String(params.maxPrice));
  if (params.sort !== "newest") retained.set("sort", params.sort);
  const query = retained.toString();
  return query ? `/shop?${query}` : "/shop";
}

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse VibeLock's latest everyday streetwear and essentials.",
  alternates: { canonical: `${SITE_URL}/shop` },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsedParams = parseDiscoverySearchParams(params);

  const [discoveryResult, categories, filterOptionsData, promoBanner] = await Promise.all([
    getDiscoveredProducts(parsedParams),
    getCategories(),
    getCatalogFilterOptions(),
    getSearchPromoBanner(parsedParams.category?.split(",").filter(Boolean) ?? []),
  ]);
  const hasSearch = Boolean(parsedParams.q?.trim());
  const searchTerm = parsedParams.q?.trim() ?? "";
  const clearSearchHref = getClearSearchHref(parsedParams);

  const hasCategory = Boolean(parsedParams.category);
  const hasPrice = parsedParams.minPrice !== undefined || parsedParams.maxPrice !== undefined;
  const hasSize = Boolean(parsedParams.size);
  const hasColor = Boolean(parsedParams.color);
  const hasActiveFilters = hasCategory || hasPrice || hasSize || hasColor;

  const filterOptions = {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId ?? null,
    })),
    ...filterOptionsData,
  };

  return (
    <Section className="bg-background relative z-10 min-h-screen pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 xl:pt-32">
      {promoBanner ? <PromoBanner banner={promoBanner} className="mb-8 sm:mb-10" /> : null}
      <Container>
        <header className="mb-4">
          <div className="border-vl-dark-100 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-vl-dark-900/55 text-xs font-bold">
                VibeLock <span className="text-vl-cyan">/</span> Shop
              </p>
              <h1 className="font-heading text-vl-black text-xl font-bold tracking-tight wrap-break-word uppercase sm:text-2xl lg:text-3xl">
                {hasSearch
                  ? "Search Results"
                  : hasActiveFilters
                    ? "Filtered Drops"
                    : "All Releases"}
              </h1>
              {hasSearch ? (
                <p className="text-vl-dark-400 mt-1.5 max-w-2xl text-xs wrap-break-word sm:text-xs">
                  Results for <span className="text-vl-dark-900 font-bold">“{searchTerm}”</span>
                </p>
              ) : (
                <p className="text-vl-dark-400 mt-1.5 text-xs sm:text-xs">
                  Showing latest available releases
                </p>
              )}
            </div>

            {/* Desktop Count + Sort on right */}
            <div className="hidden shrink-0 items-center gap-4 sm:flex">
              <p className="text-vl-dark-400 text-xs font-semibold" aria-live="polite">
                <span className="text-vl-dark-900 font-bold">{discoveryResult.totalCount}</span>{" "}
                {discoveryResult.totalCount === 1 ? "release" : "releases"}
              </p>
              <div className="bg-vl-dark-200 h-4 w-px" aria-hidden="true" />
              <CatalogSort currentSort={parsedParams.sort} />
            </div>
          </div>
        </header>
      </Container>

      <Container>
        <div className="flex flex-col gap-5 lg:flex-row">
          <ProductFilters options={filterOptions} totalCount={discoveryResult.totalCount} />
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 lg:hidden">
              <ProductFilters
                options={filterOptions}
                isMobile
                totalCount={discoveryResult.totalCount}
              />
              <CatalogSort currentSort={parsedParams.sort} />
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
