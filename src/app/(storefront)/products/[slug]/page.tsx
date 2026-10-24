import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ImageGallery } from "@/components/storefront/product/image-gallery";
import { VariantSelector } from "@/components/storefront/product/variant-selector";
import { getProductBySlug } from "@/lib/catalog/queries";
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
    alternates: { canonical: `${SITE_URL}/products/${product.slug}` },
    openGraph: {
      title: `${product.name} | VibeLock`,
      description,
      url: `${SITE_URL}/products/${product.slug}`,
      images: primaryImage ? [{ url: primaryImage.url }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

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
  };

  return (
    <Section className="min-h-screen bg-white pt-20 pb-12 sm:pt-24 sm:pb-16">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container>
        <nav
          aria-label="Breadcrumb"
          className="text-muted-foreground mb-6 flex flex-wrap items-center gap-2 text-sm sm:mb-8"
        >
          <Link
            href="/"
            className="hover:text-foreground rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
          >
            Home
          </Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          <Link
            href="/products"
            className="hover:text-foreground rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
          >
            Products
          </Link>
          {mainCategory && (
            <>
              <ChevronRight className="size-4" aria-hidden="true" />
              <Link
                href={`/category/${mainCategory.slug}`}
                className="hover:text-foreground rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
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
            <div className="border-border mb-6 border-b pb-5 sm:mb-7">
              {mainCategory && (
                <Link
                  href={`/category/${mainCategory.slug}`}
                  className="text-muted-foreground hover:text-vl-black focus-visible:ring-vl-cyan mb-3 inline-flex min-h-8 items-center text-xs font-semibold tracking-[0.18em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {mainCategory.name}
                </Link>
              )}
              <h1 className="font-heading text-vl-black text-3xl leading-tight font-black tracking-tight sm:text-4xl lg:text-[2.75rem]">
                {product.name}
              </h1>
            </div>

            <VariantSelector variants={product.variants} productAvailable={product.available} />

            {product.description && (
              <section
                className="border-border mt-8 border-t pt-6 sm:mt-10"
                aria-labelledby="product-details-heading"
              >
                <h2
                  id="product-details-heading"
                  className="font-heading text-vl-black text-sm font-bold tracking-wider uppercase"
                >
                  Product details
                </h2>
                <div className="text-muted-foreground mt-3 space-y-3 text-sm leading-6">
                  {product.description
                    .split("\n")
                    .filter(Boolean)
                    .map((line, index) => (
                      <p key={`${index}-${line}`}>{line}</p>
                    ))}
                </div>
              </section>
            )}

            {mainCategory && (
              <Link
                href={`/category/${mainCategory.slug}`}
                className="text-vl-black hover:text-vl-cyan focus-visible:ring-vl-cyan mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-semibold underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Explore {mainCategory.name} <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
