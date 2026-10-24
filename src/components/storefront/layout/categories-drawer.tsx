"use client";

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
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none xl:hidden"
        >
          <Menu className="size-4" aria-hidden="true" />
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
        className="fixed inset-y-0 left-0 z-50 flex h-full w-[min(92vw,24.5rem)] flex-col gap-0 border-r border-black/10 bg-white p-0 text-[#101114] shadow-2xl"
      >
        {/* ── 1. Top Header: ≡ CATEGORIES + ✕ Close ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 py-4">
          <SheetTitle className="font-heading flex items-center gap-2 text-sm font-black tracking-wider text-[#101114] uppercase">
            <Menu className="size-4 text-[#101114]" />
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
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#00D9FF] [&::-webkit-scrollbar-track]:bg-black/5">
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
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-[#101114] shadow-sm transition-transform active:scale-95"
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
                      <span className="font-mono text-[10px] font-bold tracking-widest text-[#00D9FF]">
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
          <Link
            href="/products"
            onClick={closeDrawer}
            className="w-full rounded-xs bg-[#101114] py-3 text-center text-xs font-black tracking-widest text-white uppercase shadow-sm transition-colors hover:bg-black/90"
          >
            SHOP ALL PRODUCTS
          </Link>

          <Link
            href="/wishlist"
            onClick={closeDrawer}
            className="flex w-full items-center justify-center gap-2 rounded-xs border border-black/15 py-2.5 text-center text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:bg-black/5"
          >
            <Heart className="size-3.5 fill-[#00D9FF] text-[#00D9FF]" />
            <span>WISHLIST ({wishlistCount})</span>
          </Link>

          <Link
            href={isAuthenticated ? "/account" : "/login"}
            onClick={closeDrawer}
            className="flex w-full items-center justify-center gap-2 rounded-xs border border-black/15 py-2.5 text-center text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:bg-black/5"
          >
            <User className="size-3.5 text-[#101114]" />
            <span>MY ACCOUNT</span>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
