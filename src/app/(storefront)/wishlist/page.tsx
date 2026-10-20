import type { Metadata } from "next";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { getDiscoveredProducts } from "@/lib/catalog/discovery";
import { WishlistContent } from "@/components/storefront/wishlist/wishlist-content";

export const metadata: Metadata = {
  title: "Saved Wishlist | VibeLock",
  description: "View and manage your curated VibeLock streetwear wishlist and saved drops.",
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  const discoveryResult = await getDiscoveredProducts({
    sort: "newest",
    page: 1,
  });

  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container>
        {/* Wishlist Header */}
        <header className="mb-8 border-b border-[#101114]/10 pb-6 sm:mb-10">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            VibeLock <span className="px-1 text-[#0099b8]">/</span> Wishlist
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-[#101114] sm:text-4xl">
                My Wishlist
              </h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
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
