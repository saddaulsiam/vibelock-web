import type { Metadata } from "next";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { WishlistContent } from "@/components/storefront/wishlist/wishlist-content";

export const metadata: Metadata = {
  title: "Saved Wishlist",
  description: "View and manage your curated VibeLock streetwear wishlist and saved drops.",
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  const discoveryResult = await getDiscoveredProducts({
    sort: "newest",
    page: 1,
  });

  return (
    <Section className="bg-background min-h-screen pt-20 pb-12 sm:pt-24 sm:pb-16">
      <Container>
        {/* Wishlist Header */}
        <header className="border-vl-dark-900/10 mb-8 border-b pb-6 sm:mb-10">
          <p className="text-muted-foreground tracking-streetwear mb-2 text-[11px] font-semibold uppercase">
            VibeLock <span className="text-vl-cyan-600 px-1">/</span> Wishlist
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-heading text-vl-dark-900 text-3xl font-black tracking-tight uppercase sm:text-4xl">
                My Wishlist
              </h1>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                Saved streetwear pieces, oversized fits, and city essentials.
              </p>
            </div>
          </div>
        </header>

        {/* Wishlist Body */}
        <WishlistContent initialProducts={discoveryResult.products} />
      </Container>
    </Section>
  );
}
