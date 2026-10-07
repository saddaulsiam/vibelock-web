import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { getProductBySlug } from "@/lib/catalog/queries";
import { ImageGallery } from "@/components/storefront/product/image-gallery";
import { VariantSelector } from "@/components/storefront/product/variant-selector";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const p = await params;
  const product = await getProductBySlug(p.slug);
  
  if (!product) return {};

  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
  const ogImage = primaryImage ? { url: primaryImage.url } : undefined;

  return {
    title: `${product.name} | VibeLock`,
    description: product.description || `Buy ${product.name} at VibeLock.`,
    openGraph: {
      title: `${product.name} | VibeLock`,
      description: product.description || `Buy ${product.name} at VibeLock.`,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const p = await params;
  const product = await getProductBySlug(p.slug);
  
  if (!product) {
    notFound();
  }

  // Breadcrumbs
  const mainCategory = product.categories[0];

  const offers = product.minPrice === product.maxPrice 
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

  // Structured Data (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.images.map(img => img.url),
    offers,
  };

  return (
    <Section className="py-8 bg-background min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container>
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-muted-foreground mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          {mainCategory && (
            <>
              <Link href={`/category/${mainCategory.slug}`} className="hover:text-foreground transition-colors">
                {mainCategory.name}
              </Link>
              <ChevronRight className="h-4 w-4 mx-2" />
            </>
          )}
          <span className="text-foreground font-medium" aria-current="page">
            {product.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left Column: Image Gallery */}
          <div className="w-full">
            <ImageGallery images={product.images} productName={product.name} />
          </div>

          {/* Right Column: Details & Variants */}
          <div className="w-full flex flex-col pt-2 lg:pt-6">
            <div className="mb-6">
              {mainCategory && (
                <p className="text-brand-cyan font-bold tracking-widest uppercase text-sm mb-2">
                  {mainCategory.name}
                </p>
              )}
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-charcoal mb-4">
                {product.name}
              </h1>
            </div>

            <VariantSelector 
              variants={product.variants}
              defaultPrice={product.minPrice}
              defaultHasDiscount={product.hasDiscount}
              defaultOriginalPrice={product.maxPrice} // Conceptual fallback if variant logic isn't matched
            />

            {product.description && (
              <div className="mt-12 pt-8 border-t">
                <h2 className="text-lg font-semibold mb-4">Product Details</h2>
                <div className="prose prose-sm text-muted-foreground max-w-none">
                  {/* Using standard line-breaks for plain text description */}
                  {product.description.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
