import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";
import { DiscoveryPagination } from "@/components/storefront/catalog/pagination";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ProductGrid } from "@/components/storefront/catalog/product-grid";
import { PromoBanner } from "@/components/storefront/catalog/promo-banner";
import { getCategoryPromoBanner } from "@/lib/catalog/banners";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { getCatalogFilterOptions, getCategories, getCategoryBySlug } from "@/lib/catalog/queries";
import { parseDiscoverySearchParams } from "@/lib/catalog/validation";
import { SITE_URL } from "@/lib/seo/site";
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
  const [category, categories, filterOptionsData, promoBanner] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(),
    getCatalogFilterOptions(),
    getCategoryPromoBanner(slug),
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
    <Section className="min-h-screen bg-white pt-20 pb-12 sm:pt-24 sm:pb-16">
      <Container>
        {promoBanner ? (
          <div className="mb-5 sm:mb-6">
            <PromoBanner banner={promoBanner} />
          </div>
        ) : null}

        <header className="mb-6 sm:mb-8">
          <nav aria-label="Breadcrumb" className="mb-2">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#101114]/55 uppercase">
              VibeLock <span className="px-1 text-[#00D9FF]">/</span> Category
            </p>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#101114] sm:text-4xl">
                {category.name}
              </h1>
              {category.description ? (
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#101114]/60 sm:text-sm sm:leading-6">
                  {category.description}
                </p>
              ) : null}
            </div>
            <p className="shrink-0 pb-0.5 text-xs text-[#101114]/60 sm:text-sm" aria-live="polite">
              <span className="font-semibold text-[#101114]">{discoveryResult.totalCount}</span>{" "}
              {discoveryResult.totalCount === 1 ? "product" : "products"}
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <ProductFilters options={filterOptions} lockedCategorySlug={slug} />
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-center justify-between gap-4 lg:hidden">
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
