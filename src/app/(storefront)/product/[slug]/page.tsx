import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ImageGallery } from "@/components/storefront/product/image-gallery";
import { VariantSelector } from "@/components/storefront/product/variant-selector";
import { ProductReviewsSection } from "@/components/storefront/product/reviews/product-reviews-section";
import { StarRating } from "@/components/storefront/product/reviews/star-rating";
import { getProductBySlug } from "@/lib/catalog/queries";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getProductReviews, getUserReviewEligibility } from "@/lib/reviews/queries";
import { SITE_URL } from "@/lib/seo/site";
import { notFound } from "next/navigation";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return {};

  const primaryImage = product.images.find((image) => image.isPrimary) || product.images[0];
  const description = product.description || `Shop ${product.name} at VibeLock.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `${SITE_URL}/shop/${product.slug}` },
    openGraph: {
      title: `${product.name} | VibeLock`,
      description,
      url: `${SITE_URL}/shop/${product.slug}`,
      images: primaryImage ? [{ url: primaryImage.url }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const currentUser = await getCurrentUser();
  const [{ reviews, summary }, eligibility] = await Promise.all([
    getProductReviews(product.id),
    getUserReviewEligibility(currentUser?.id, product.id),
  ]);

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const mainCategory = product.categories[0];

  const offers =
    product.minPrice === product.maxPrice
      ? {
          "@type": "Offer",
          priceCurrency: "BDT",
          price: product.minPrice,
          availability: product.available
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : {
          "@type": "AggregateOffer",
          priceCurrency: "BDT",
          lowPrice: product.minPrice,
          highPrice: product.maxPrice,
          offerCount: product.variants.length || 1,
          availability: product.available
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.images.map((image) => image.url),
    offers,
    ...(summary.totalReviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: summary.averageRating,
            reviewCount: summary.totalReviews,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <Section className="min-h-screen bg-white pt-20 pb-12 sm:pt-24 sm:pb-16">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container className="max-w-6xl">
        <nav
          aria-label="Breadcrumb"
          className="text-muted-foreground mb-6 flex flex-wrap items-center gap-2 text-sm sm:mb-8"
        >
          <Link
            href="/"
            className="hover:text-foreground rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none"
          >
            Home
          </Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          <Link
            href="/shop"
            className="hover:text-foreground rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none"
          >
            Products
          </Link>
          {mainCategory && (
            <>
              <ChevronRight className="size-4" aria-hidden="true" />
              <Link
                href={`/category/${mainCategory.slug}`}
                className="hover:text-foreground rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none"
              >
                {mainCategory.name}
              </Link>
            </>
          )}
          <ChevronRight className="size-4" aria-hidden="true" />
          <span
            className="text-foreground max-w-full font-medium wrap-break-word"
            aria-current="page"
          >
            {product.name}
          </span>
        </nav>

        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] lg:gap-12 xl:gap-16">
          <div className="min-w-0">
            <ImageGallery images={product.images} productName={product.name} />
          </div>

          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="border-b border-vl-dark-900/10 mb-6 pb-5 sm:mb-7">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                {mainCategory && (
                  <Link
                    href={`/category/${mainCategory.slug}`}
                    className="text-xs font-bold tracking-[0.2em] uppercase text-vl-dark-900/60 hover:text-vl-cyan-600 focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none transition-colors"
                  >
                    {mainCategory.name}
                  </Link>
                )}
                {product.variants[0]?.sku && (
                  <span className="font-mono text-[11px] font-semibold text-vl-dark-900/40 tracking-wider">
                    SKU: {product.variants[0].sku}
                  </span>
                )}
              </div>

              <h1 className="font-heading text-vl-dark-900 text-3xl leading-tight font-black tracking-tight sm:text-4xl lg:text-[2.6rem]">
                {product.name}
              </h1>

              {summary.totalReviews > 0 ? (
                <a
                  href="#reviews"
                  className="mt-2.5 inline-flex items-center gap-2 text-xs font-semibold text-vl-dark-900/75 transition-colors hover:text-vl-cyan-600"
                >
                  <StarRating value={Math.round(summary.averageRating)} size="sm" />
                  <span className="font-mono font-bold text-vl-dark-900">
                    {summary.averageRating.toFixed(1)}
                  </span>
                  <span className="text-vl-dark-900/50">
                    ({summary.totalReviews} {summary.totalReviews === 1 ? "review" : "reviews"})
                  </span>
                </a>
              ) : (
                <a
                  href="#reviews"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-vl-dark-900/55 transition-colors hover:text-vl-cyan-600"
                >
                  <StarRating value={0} size="sm" />
                  <span>Be the first to review</span>
                </a>
              )}
            </div>

            <VariantSelector
              variants={product.variants}
              productAvailable={product.available}
              productSlug={product.slug}
              productName={product.name}
              description={product.description}
            />

            {mainCategory && (
              <div className="mt-6 pt-4 border-t border-vl-dark-900/5">
                <Link
                  href={`/category/${mainCategory.slug}`}
                  className="text-xs font-bold text-vl-dark-900 hover:text-vl-cyan-600 focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none inline-flex items-center gap-1.5 tracking-wider uppercase transition-colors"
                >
                  <span>Explore More {mainCategory.name}</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Customer Ratings & Reviews Section */}
        <div className="mt-14 sm:mt-20">
          <ProductReviewsSection
            productId={product.id}
            productSlug={product.slug}
            reviews={reviews}
            summary={summary}
            eligibility={eligibility}
            currentUserId={currentUser?.id}
            isAdmin={currentUser?.role === "ADMIN"}
          />
        </div>
      </Container>
    </Section>
  );
}
