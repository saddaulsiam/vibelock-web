"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CategorySummary } from "@/lib/catalog/types";
import { getWishlistServerSnapshot, getWishlistSnapshot, subscribeWishlist } from "@/lib/wishlist";
import { Heart, Menu, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

export interface CategoriesDrawerProps {
  categories?: CategorySummary[];
  isAuthenticated?: boolean;
  variant?: "desktop" | "mobile";
  children?: React.ReactNode;
}

const DEFAULT_CATEGORY_IMAGE = "/images/categories/cat-t-shirts.jpg";

export function CategoriesDrawer({
  categories = [],
  isAuthenticated = false,
  variant = "desktop",
  children,
}: CategoriesDrawerProps) {
  const [open, setOpen] = useState(false);
  const closeDrawer = () => setOpen(false);

  // Subscribe to real-time client wishlist updates
  const rawWishlist = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );

  const wishlistCount = useMemo(() => {
    try {
      const parsed = JSON.parse(rawWishlist);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, [rawWishlist]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children ? (
        <SheetTrigger
          onClick={() => setOpen(true)}
          className="cursor-pointer focus-visible:outline-none"
        >
          {children}
        </SheetTrigger>
      ) : variant === "mobile" ? (
        <SheetTrigger
          id="mobile-nav-trigger"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="hover:text-vl-cyan text-vl-white/75 hover:bg-vl-white/10 focus-visible:ring-vl-cyan inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-9 xl:hidden"
        >
          <Menu className="size-4 sm:size-4.5" aria-hidden="true" />
        </SheetTrigger>
      ) : (
        <SheetTrigger
          id="categories-drawer-trigger"
          onClick={() => setOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 text-white/75 transition-colors hover:text-white focus-visible:outline-none"
          aria-label="Open categories menu"
        >
          <Menu className="size-3.5 text-white/75 hover:text-white" />
          <span>CATEGORIES</span>
        </SheetTrigger>
      )}

      <SheetContent
        side="left"
        showCloseButton={false}
        className="text-vl-dark-900 fixed inset-y-0 left-0 z-50 flex h-full w-[min(92vw,24.5rem)] flex-col gap-0 border-r border-black/10 bg-white p-0 shadow-2xl"
      >
        {/* ── 1. Top Header: ≡ CATEGORIES + ✕ Close ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 py-4">
          <SheetTitle className="font-heading text-vl-dark-900 flex items-center gap-2 text-sm font-black tracking-wider uppercase">
            <Menu className="text-vl-dark-900 size-4" />
            <span>CATEGORIES</span>
          </SheetTitle>

          <SheetClose
            className="flex size-7 cursor-pointer items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none"
            aria-label="Close categories menu"
          >
            <X className="size-5" />
          </SheetClose>
        </div>

        {/* ── 2. Scrollable Category Grid with Cyan Scrollbar ── */}
        <div className="[&::-webkit-scrollbar-thumb]:bg-vl-cyan flex-1 overflow-y-auto p-3.5 sm:p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-black/5">
          {categories.length === 0 ? (
            <div className="flex h-36 items-center justify-center text-center text-xs text-black/40">
              No categories found
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {categories.map((cat, idx) => {
                const num = String(idx + 1).padStart(2, "0");
                const img = cat.imageUrl || DEFAULT_CATEGORY_IMAGE;
                const cleanName = cat.name.replace(/^\d+[.\s-]+/, "").trim();

                return (
                  <Link
                    key={cat.id || cat.slug}
                    href={`/category/${cat.slug}`}
                    onClick={closeDrawer}
                    className="group bg-vl-dark-900 relative aspect-square overflow-hidden rounded-xl shadow-sm transition-transform active:scale-95"
                  >
                    <Image
                      src={img}
                      alt={cleanName}
                      fill
                      sizes="(max-width: 640px) 45vw, 190px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/45 transition-colors group-hover:bg-black/55" />
                    <div className="relative z-10 flex h-full flex-col items-center justify-center p-2 text-center">
                      <span className="text-2xs text-vl-cyan font-mono font-bold tracking-widest">
                        {num}
                      </span>
                      <span className="font-heading text-xs font-black tracking-wide text-white uppercase drop-shadow-sm sm:text-sm">
                        {cleanName}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 3. Bottom Docked Actions ── */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-black/10 bg-white p-3.5 sm:p-4">
          <Button asChild variant="primary" size="default">
            <Link href="/shop" onClick={closeDrawer}>
              SHOP ALL PRODUCTS
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm">
            <Link href="/wishlist" onClick={closeDrawer}>
              <Heart className="fill-vl-cyan text-vl-cyan size-3.5" />
              <span>WISHLIST ({wishlistCount})</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm">
            <Link href={isAuthenticated ? "/account" : "/login"} onClick={closeDrawer}>
              <User className="text-vl-dark-900 size-3.5" />
              <span>MY ACCOUNT</span>
            </Link>
          </Button>

          <div className="text-2xs flex items-center justify-center gap-3 pt-1 font-semibold tracking-wider text-black/60 uppercase">
            <Link
              href="/about"
              onClick={closeDrawer}
              className="transition-colors hover:text-black"
            >
              About
            </Link>
            <span className="text-black/30" aria-hidden="true">
              •
            </span>
            <Link
              href="/contact"
              onClick={closeDrawer}
              className="transition-colors hover:text-black"
            >
              Contact
            </Link>
            <span className="text-black/30" aria-hidden="true">
              •
            </span>
            <Link href="/faq" onClick={closeDrawer} className="transition-colors hover:text-black">
              FAQ
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
