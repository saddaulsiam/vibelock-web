import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";
import { DiscoveryPagination } from "@/components/storefront/catalog/pagination";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ProductGrid } from "@/components/storefront/catalog/product-grid";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { getCategories, getCategoryBySlug } from "@/lib/catalog/queries";
import { parseDiscoverySearchParams } from "@/lib/catalog/validation";
import { SITE_URL } from "@/lib/seo/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) return {};

  const description =
    category.description || `Browse the latest ${category.name} collection at VibeLock.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `${SITE_URL}/category/${category.slug}` },
    openGraph: {
      title: `${category.name} | VibeLock`,
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
  const [category, categories] = await Promise.all([getCategoryBySlug(slug), getCategories()]);

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
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Grey", "Navy", "Red", "Olive"],
  };

  return (
    <Section className="min-h-screen bg-white py-10 sm:py-14 lg:py-16">
      <Container>
        <header className="mb-8 border-b border-border pb-7 sm:mb-10 sm:pb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            VibeLock / Category
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{category.name}</h1>
          {category.description && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {category.description}
            </p>
          )}
          <p className="mt-4 text-sm font-medium text-foreground" aria-live="polite">
            {discoveryResult.totalCount} {discoveryResult.totalCount === 1 ? "product" : "products"}
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <ProductFilters options={filterOptions} lockedCategorySlug={slug} />
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-center justify-between gap-4 lg:hidden">
              <ProductFilters options={filterOptions} isMobile lockedCategorySlug={slug} />
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
