"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Heart, ArrowRight, Trash2 } from "lucide-react";
import { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";

import { subscribeWishlist, getWishlistSnapshot, getWishlistServerSnapshot } from "@/lib/wishlist";

interface WishlistContentProps {
  initialProducts: ProductSummary[];
}

export function WishlistContent({ initialProducts }: WishlistContentProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const rawWishlist = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );

  const wishlistSlugs = useMemo<string[]>(() => {
    try {
      return JSON.parse(rawWishlist);
    } catch {
      return [];
    }
  }, [rawWishlist]);

  const saveSlugs = (slugs: string[]) => {
    try {
      localStorage.setItem("vibelock_wishlist", JSON.stringify(slugs));
      window.dispatchEvent(new Event("wishlist-update"));
    } catch {
      // Ignore
    }
  };

  const handleRemove = (slug: string) => {
    const updated = wishlistSlugs.filter((s) => s !== slug);
    saveSlugs(updated);
    toast.success("Item removed from your wishlist.");
  };

  const clearAll = () => {
    saveSlugs([]);
    toast.success("Wishlist cleared.");
  };

  const mapToProductCard = (product: ProductSummary) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.minPrice,
    originalPrice: product.hasDiscount ? product.maxPrice : undefined,
    image: product.primaryImage?.url ?? "",
    badge: product.hasDiscount ? { label: "Sale", variant: "sale" as const } : undefined,
  });

  const savedProducts = initialProducts.filter((p) => wishlistSlugs.includes(p.slug));
  const recommendedProducts = initialProducts.slice(0, 4);

  if (!isMounted) {
    return (
      <div className="space-y-12" role="status" aria-label="Loading wishlist">
        <div>
          <div className="mb-6 flex items-center justify-between border-b border-[#101114]/10 pb-4">
            <Skeleton className="h-4 w-24 bg-[#101114]/10" />
            <Skeleton className="h-4 w-16 bg-[#101114]/10" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="aspect-3/4 w-full rounded-2xl bg-[#101114]/10" />
                <div className="space-y-1.5 pt-1">
                  <Skeleton className="h-3.5 w-3/4 bg-[#101114]/10" />
                  <Skeleton className="h-4 w-1/3 bg-[#101114]/10" />
                </div>
                <Skeleton className="h-8 w-full rounded-xl bg-[#101114]/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {savedProducts.length > 0 ? (
        <div>
          {/* Action Bar */}
          <div className="mb-6 flex items-center justify-between border-b border-[#101114]/10 pb-4">
            <span className="text-xs font-bold text-[#101114]">
              {savedProducts.length} {savedProducts.length === 1 ? "Saved Item" : "Saved Items"}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-rose-600 transition-colors hover:text-rose-700"
            >
              Clear All
            </button>
          </div>

          {/* Saved Items Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {savedProducts.map((product) => (
              <div key={product.id} className="group relative flex flex-col justify-between">
                <ProductCard product={mapToProductCard(product)} />
                <button
                  type="button"
                  onClick={() => handleRemove(product.slug)}
                  className="text-muted-foreground mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white py-2 text-xs font-semibold transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#101114]/15 bg-white p-8 py-16 text-center shadow-xs sm:p-12 sm:py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F0E8] text-[#101114]">
            <Heart className="size-8 text-[#0099b8]" />
          </div>
          <h2 className="mt-4 text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
            Your wishlist is empty
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md text-xs leading-relaxed sm:text-sm">
            Hit the heart icon on any streetwear drop, graphic tee, or oversized hoodie to save your
            favorite fits for later.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#101114] px-6 py-3 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-[#1f2229] active:scale-95"
          >
            <span>Explore Drops</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {/* Featured / Trending Streetwear Drops */}
      <div className="border-t border-[#101114]/10 pt-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-[#0099b8] uppercase">
              Trending Drops
            </span>
            <h3 className="mt-1 text-lg font-black tracking-tight text-[#101114] uppercase sm:text-xl">
              You Might Also Like
            </h3>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-1 text-xs font-bold text-[#101114] transition-colors hover:text-[#0099b8]"
          >
            <span>View All</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {recommendedProducts.map((product) => (
            <ProductCard key={product.id} product={mapToProductCard(product)} />
          ))}
        </div>
      </div>
    </div>
  );
}
