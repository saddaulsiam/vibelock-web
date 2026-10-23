import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { PromoBanner } from "@/components/storefront/catalog/promo-banner";
import { Section } from "@/components/shared/section";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";
import { DiscoveryPagination } from "@/components/storefront/catalog/pagination";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ProductGrid } from "@/components/storefront/catalog/product-grid";
import { getCategories, getCatalogFilterOptions } from "@/lib/catalog/queries";
import { getSearchPromoBanner } from "@/lib/catalog/banners";
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

  const [discoveryResult, categories, filterOptionsData, promoBanner] = await Promise.all([
    getDiscoveredProducts(parsedParams),
    getCategories(),
    getCatalogFilterOptions(),
    getSearchPromoBanner(parsedParams.category?.split(",").filter(Boolean) ?? []),
  ]);
  const hasSearch = Boolean(parsedParams.q?.trim());
  const searchTerm = parsedParams.q?.trim() ?? "";
  const clearSearchHref = getClearSearchHref(parsedParams);

  const filterOptions = {
    categories: categories.map((category) => ({ name: category.name, slug: category.slug })),
    ...filterOptionsData,
  };

  return (
    <Section className="min-h-screen bg-white pt-6 pb-12 sm:pt-8 sm:pb-16">
      <Container>
        <header className="mb-6 sm:mb-8">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-[#101114]/55 uppercase">
            VibeLock <span className="px-1 text-[#00D9FF]">/</span> {hasSearch ? "Search" : "Shop"}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="font-heading text-vl-black text-3xl font-black tracking-tight wrap-break-word uppercase sm:text-4xl lg:text-5xl">
                {hasSearch ? "Search results" : "All products"}
              </h1>
              {hasSearch ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 wrap-break-word text-[#101114]/60 sm:text-base">
                  Results for <span className="font-medium text-[#101114]">“{searchTerm}”</span>
                </p>
              ) : (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#101114]/60 sm:text-base">
                  Everyday pieces and easy layers for your city rotation.
                </p>
              )}
            </div>
            <p className="shrink-0 pb-1 text-sm text-[#101114]/60" aria-live="polite">
              <span className="font-semibold text-[#101114]">{discoveryResult.totalCount}</span>{" "}
              {discoveryResult.totalCount === 1 ? "product" : "products"}
            </p>
          </div>
          {hasSearch ? (
            <Link
              href={clearSearchHref}
              className="mt-4 inline-flex min-h-10 items-center justify-center border border-[#101114]/20 px-4 text-sm font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
            >
              Clear search
            </Link>
          ) : null}
        </header>
      </Container>

      {promoBanner ? <PromoBanner banner={promoBanner} className="mb-8 sm:mb-10" /> : null}

      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <ProductFilters options={filterOptions} />
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-center justify-between gap-4 lg:hidden">
              <ProductFilters options={filterOptions} isMobile />
              <span className="text-muted-foreground text-sm">
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
