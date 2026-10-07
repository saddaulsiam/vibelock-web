import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { parseDiscoverySearchParams } from "@/lib/catalog/validation";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { getCategoryBySlug, getCategories } from "@/lib/catalog/queries";
import { ProductGrid } from "@/components/storefront/catalog/product-grid";
import { DiscoveryPagination } from "@/components/storefront/catalog/pagination";
import { ProductFilters } from "@/components/storefront/catalog/product-filters";
import { ActiveFilters } from "@/components/storefront/catalog/active-filters";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await params;
  const category = await getCategoryBySlug(p.slug);

  if (!category) return {};

  return {
    title: `${category.name} - VibeLock`,
    description:
      category.description || `Browse the latest ${category.name} collection at VibeLock.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sParams = await searchParams;

  const category = await getCategoryBySlug(p.slug);
  if (!category) {
    notFound();
  }

  // Inject category slug into the parsed params
  const parsedParams = parseDiscoverySearchParams(sParams);

  // If the user already selected some categories via filters, we need to respect them,
  // but conceptually a category page filters by its own slug first.
  // A robust approach is to force the current category slug into the filters.
  // If the filter has 'category=shirts,pants', we might override or intersect.
  // We'll override the base category here.
  parsedParams.category = parsedParams.category ? `${p.slug},${parsedParams.category}` : p.slug;

  const [discoveryResult, allCategories] = await Promise.all([
    getDiscoveredProducts(parsedParams),
    getCategories(),
  ]);

  const filterOptions = {
    categories: allCategories.map((c) => ({ name: c.name, slug: c.slug })),
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Grey", "Navy", "Red", "Olive"],
  };

  return (
    <Section className="py-12 bg-background min-h-screen">
      <Container>
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground mb-4 max-w-2xl">{category.description}</p>
          )}
          <p className="text-sm font-medium text-brand-cyan">
            {discoveryResult.totalCount} {discoveryResult.totalCount === 1 ? "product" : "products"}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <ProductFilters options={filterOptions} />

          <div className="flex-1">
            <div className="mb-6 lg:hidden">
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
