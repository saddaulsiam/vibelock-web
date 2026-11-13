import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";
import { CatalogSort } from "@/components/storefront/catalog/catalog-sort";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ProductInfiniteGrid } from "@/components/storefront/catalog/product-infinite-grid";
import { PromoBanner } from "@/components/storefront/catalog/promo-banner";
import { getCategoryPromoBanners } from "@/lib/catalog/banners";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { getCatalogFilterOptions, getCategories, getCategoryBySlug } from "@/lib/catalog/queries";
import { parseDiscoverySearchParams } from "@/lib/catalog/validation";
import { SITE_URL } from "@/lib/seo/site";
import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

function getClearCategorySearchHref(
  slug: string,
  params: ReturnType<typeof parseDiscoverySearchParams>
) {
  const retained = new URLSearchParams();
  if (params.size) retained.set("size", params.size);
  if (params.color) retained.set("color", params.color);
  if (params.minPrice !== undefined) retained.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) retained.set("maxPrice", String(params.maxPrice));
  if (params.sort !== "newest") retained.set("sort", params.sort);
  const query = retained.toString();
  return query ? `/category/${slug}?${query}` : `/category/${slug}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) return {};

  const title = category.metaTitle?.trim() || category.name;
  const description =
    category.metaDescription?.trim() ||
    category.description ||
    `Browse the latest ${category.name} collection at VibeLock.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/category/${category.slug}` },
    openGraph: {
      title: `${title} | VibeLock`,
      description,
      url: `${SITE_URL}/category/${category.slug}`,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const [category, categories, filterOptionsData, promoBanners] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(),
    getCatalogFilterOptions(),
    getCategoryPromoBanners(slug),
  ]);

  if (!category) notFound();

  const parsedParams = parseDiscoverySearchParams(rawSearchParams);
  const selectedCategories = parsedParams.category
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  parsedParams.category = Array.from(new Set([slug, ...(selectedCategories ?? [])])).join(",");

  const discoveryResult = await getDiscoveredProducts(parsedParams);

  const hasSearch = Boolean(parsedParams.q?.trim());
  const searchTerm = parsedParams.q?.trim() ?? "";
  const clearSearchHref = getClearCategorySearchHref(slug, parsedParams);

  const filterOptions = {
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId ?? null,
    })),
    ...filterOptionsData,
  };

  const gridSearchParams: Record<string, string | string[] | undefined> = {
    ...rawSearchParams,
    category: parsedParams.category,
  };

  return (
    <Section
      className={cn(
        "relative z-10 min-h-screen bg-white pb-12 sm:pb-16",
        promoBanners.length > 0 ? "pt-16 sm:pt-20 lg:pt-24" : "pt-20 sm:pt-24 lg:pt-28"
      )}
    >
      <Container>
        {promoBanners.length > 0 ? (
          <div className="mb-5 sm:mb-6">
            <PromoBanner banners={promoBanners} />
          </div>
        ) : null}

        <header className="mb-4">
          <nav aria-label="Breadcrumb" className="mb-1">
            <p className="text-vl-dark-900/55 text-[11px] font-semibold tracking-[0.18em] uppercase">
              VibeLock <span className="text-vl-cyan px-1">/</span>{" "}
              <Link href="/shop" className="hover:text-vl-cyan transition-colors">
                Shop
              </Link>{" "}
              <span className="text-vl-cyan px-1">/</span> {category.name}
            </p>
          </nav>
          <div className="border-border/50 mb-8 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-heading text-vl-black text-xl font-bold tracking-tight wrap-break-word uppercase sm:text-2xl lg:text-3xl">
                {hasSearch ? "Search Results" : category.name}
              </h1>
              {hasSearch ? (
                <p className="text-vl-dark-400 mt-1 max-w-2xl text-xs wrap-break-word sm:text-sm">
                  Results for <span className="text-vl-dark-900 font-bold">“{searchTerm}”</span> in{" "}
                  <span className="text-vl-dark-900 font-semibold">{category.name}</span>
                </p>
              ) : category.description ? (
                <p className="text-vl-dark-400 mt-1 max-w-2xl text-xs leading-relaxed sm:text-sm sm:leading-6">
                  {category.description}
                </p>
              ) : (
                <p className="text-vl-dark-400 mt-1 text-xs sm:text-sm">
                  Showing latest {category.name.toLowerCase()} releases
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

        <div className="flex flex-col gap-5 lg:flex-row">
          <ProductFilters
            options={filterOptions}
            lockedCategorySlug={slug}
            totalCount={discoveryResult.totalCount}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 lg:hidden">
              <ProductFilters
                options={filterOptions}
                isMobile
                lockedCategorySlug={slug}
                totalCount={discoveryResult.totalCount}
              />
              <CatalogSort currentSort={parsedParams.sort} />
            </div>
            <ActiveFilters />
            <ProductInfiniteGrid
              key={JSON.stringify(gridSearchParams)}
              initialProducts={discoveryResult.products}
              totalCount={discoveryResult.totalCount}
              totalPages={discoveryResult.totalPages}
              searchParams={gridSearchParams}
              searchTerm={hasSearch ? searchTerm : undefined}
              clearSearchHref={clearSearchHref}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
