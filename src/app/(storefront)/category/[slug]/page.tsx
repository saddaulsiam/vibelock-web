import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";
import { CatalogSort } from "@/components/storefront/catalog/catalog-sort";
import { DiscoveryPagination } from "@/components/storefront/catalog/pagination";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ProductGrid } from "@/components/storefront/catalog/product-grid";
import { PromoBanner } from "@/components/storefront/catalog/promo-banner";
import { getCategoryPromoBanners } from "@/lib/catalog/banners";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { getCatalogFilterOptions, getCategories, getCategoryBySlug } from "@/lib/catalog/queries";
import { parseDiscoverySearchParams } from "@/lib/catalog/validation";
import { SITE_URL } from "@/lib/seo/site";
import { cn } from "cn";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
  const filterOptions = {
    categories: categories.map((item) => ({ name: item.name, slug: item.slug })),
    ...filterOptionsData,
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

        <header className="mb-6 sm:mb-8">
          <nav aria-label="Breadcrumb" className="mb-1">
            <p className="text-vl-dark-900/55 text-[11px] font-semibold tracking-[0.18em] uppercase">
              VibeLock <span className="text-vl-cyan px-1">/</span> Category
            </p>
          </nav>
          <div className="border-border/50 mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
            <div className="min-w-0">
              <h1 className="font-heading text-vl-black text-xl font-bold tracking-tight wrap-break-word uppercase sm:text-2xl lg:text-3xl">
                {category.name}
              </h1>
              {category.description ? (
                <p className="text-vl-dark-900/60 mt-1.5 max-w-2xl text-xs leading-relaxed sm:text-sm sm:leading-6">
                  {category.description}
                </p>
              ) : null}
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

        <div className="flex flex-col gap-6 lg:flex-row">
          <ProductFilters options={filterOptions} lockedCategorySlug={slug} />
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
              <ProductFilters options={filterOptions} isMobile lockedCategorySlug={slug} />
              <span className="text-muted-foreground text-sm">
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
