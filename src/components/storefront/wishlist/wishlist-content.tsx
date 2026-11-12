"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Heart, ArrowRight, Trash2 } from "lucide-react";
import { ProductSummary } from "@/lib/catalog/types";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

  const savedProducts = initialProducts.filter((p) => wishlistSlugs.includes(p.slug));
  const recommendedProducts = initialProducts.slice(0, 5);

  if (!isMounted) {
    return (
      <div className="space-y-12" role="status" aria-label="Loading wishlist">
        <div>
          <div className="border-vl-black/10 mb-6 flex items-center justify-between border-b pb-4">
            <Skeleton className="bg-vl-dark-900/10 h-4 w-24" />
            <Skeleton className="bg-vl-dark-900/10 h-4 w-16" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="bg-vl-dark-900/10 aspect-3/4 w-full rounded-2xl" />
                <div className="space-y-1.5 pt-1">
                  <Skeleton className="bg-vl-dark-900/10 h-3.5 w-3/4" />
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-1/3" />
                </div>
                <Skeleton className="bg-vl-dark-900/10 h-8 w-full rounded-xl" />
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
          <div className="border-vl-black/10 mb-6 flex items-center justify-between border-b pb-4">
            <span className="text-vl-dark-900 text-xs font-bold">
              {savedProducts.length} {savedProducts.length === 1 ? "Saved Item" : "Saved Items"}
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={clearAll}
              className="h-auto p-0 text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              Clear All
            </Button>
          </div>

          {/* Saved Items Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {savedProducts.map((product) => (
              <div key={product.id} className="group relative flex flex-col justify-between">
                <ProductCard product={product} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(product.slug)}
                  className="text-muted-foreground border-vl-black/15 mt-2.5 w-full rounded-xl bg-white text-xs font-semibold hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-3.5" />
                  <span>Remove</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="border-vl-black/15 flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white p-8 py-16 text-center shadow-xs sm:p-12 sm:py-20">
          <div className="bg-vl-white text-vl-dark-900 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Heart className="text-vl-cyan-dark size-8" />
          </div>
          <h2 className="text-vl-dark-900 mt-4 text-xl font-black tracking-tight uppercase sm:text-2xl">
            Your wishlist is empty
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md text-xs leading-relaxed sm:text-sm">
            Hit the heart icon on any streetwear drop, graphic tee, or oversized hoodie to save your
            favorite fits for later.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/shop">
              <span>Explore Drops</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}

      {/* Featured / Trending Streetwear Drops */}
      <div className="border-vl-black/10 border-t pt-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="text-vl-cyan-dark text-[11px] font-bold tracking-widest uppercase">
              Trending Drops
            </span>
            <h3 className="text-vl-dark-900 mt-1 text-lg font-black tracking-tight uppercase sm:text-xl">
              You Might Also Like
            </h3>
          </div>
          <Link
            href="/shop"
            className="hover:text-vl-cyan-dark group text-vl-dark-900 inline-flex items-center gap-1 text-xs font-bold transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5">
          {recommendedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
