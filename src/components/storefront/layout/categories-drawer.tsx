"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Menu, User, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CategorySummary } from "@/lib/catalog/types";
import { getWishlistServerSnapshot, getWishlistSnapshot, subscribeWishlist } from "@/lib/wishlist";
import { toast } from "sonner";

export interface CategoriesDrawerProps {
  categories?: CategorySummary[];
  isAuthenticated?: boolean;
  variant?: "desktop" | "mobile";
  children?: React.ReactNode;
}

const FALLBACK_CATEGORIES: CategorySummary[] = [
  {
    id: "1",
    name: "T-Shirts",
    slug: "t-shirts",
    description: null,
    imageUrl: "/uploads/categories/cat-t-shirts-1792644747198.webp",
  },
  {
    id: "2",
    name: "Shirts",
    slug: "shirts",
    description: null,
    imageUrl: "/uploads/categories/cat-shirts-1792644839597.webp",
  },
  {
    id: "3",
    name: "Pants",
    slug: "pants",
    description: null,
    imageUrl: "/uploads/categories/cat-pants-1792644805791.webp",
  },
  {
    id: "4",
    name: "Shorts",
    slug: "shorts",
    description: null,
    imageUrl: "/uploads/categories/cat-shorts-1792644877482.webp",
  },
  {
    id: "5",
    name: "Sneakers",
    slug: "sneakers",
    description: null,
    imageUrl:
      "https://res.cloudinary.com/dtkl4ic8s/image/upload/v1792657088/vibelock/categories/j0o3v9rvvv4jypgqhghe.webp",
  },
  {
    id: "6",
    name: "Watch",
    slug: "watch",
    description: null,
    imageUrl:
      "https://res.cloudinary.com/dtkl4ic8s/image/upload/v1792660362/vibelock/categories/k0anxhzzmsxipcmjjzh2.webp",
  },
  {
    id: "7",
    name: "Fashion Accessories",
    slug: "fashion-accessories",
    description: null,
    imageUrl:
      "https://res.cloudinary.com/dtkl4ic8s/image/upload/v1792660422/vibelock/categories/qcw3wt6itzyjdb7ecen4.webp",
  },
  {
    id: "8",
    name: "Imported Slides",
    slug: "imported-slides",
    description: null,
    imageUrl:
      "https://res.cloudinary.com/dtkl4ic8s/image/upload/v1792660469/vibelock/categories/ekantghianlooi7rka3r.webp",
  },
  {
    id: "9",
    name: "Panjabi",
    slug: "panjabi",
    description: null,
    imageUrl:
      "https://res.cloudinary.com/dtkl4ic8s/image/upload/v1792660529/vibelock/categories/x5fdvjpklojynkosxlwu.webp",
  },
];

const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  "t-shirts": "/images/categories/cat-t-shirts.jpg",
  shirts: "/images/categories/cat-shirts.jpg",
  pants: "/images/categories/cat-pants.jpg",
  shorts: "/images/categories/cat-shorts.jpg",
  sneakers: "/images/hero/hero-clean.png",
  watch: "/images/collection/acc-chain.png",
  "fashion-accessories": "/images/collection/acc-cap.png",
  "imported-slides": "/images/hero/hero-slide-1.png",
  panjabi: "/images/collection/collection-feature.png",
};

export function CategoriesDrawer({
  categories = [],
  isAuthenticated = false,
  variant = "desktop",
  children,
}: CategoriesDrawerProps) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

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

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAction();
    toast.success("You've been signed out.");
    closeDrawer();
    router.push("/");
    router.refresh();
  };

  const displayCategories = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children ? (
        <SheetTrigger onClick={() => setOpen(true)} className="cursor-pointer focus-visible:outline-none">
          {children}
        </SheetTrigger>
      ) : variant === "mobile" ? (
        <SheetTrigger
          id="mobile-nav-trigger"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none xl:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </SheetTrigger>
      ) : (
        <SheetTrigger
          id="categories-drawer-trigger"
          onClick={() => setOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 text-white/75 transition-colors hover:text-white focus-visible:outline-none"
          aria-label="Open categories menu"
        >
          <Menu className="size-3.5 text-white/50" />
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
          <SheetTitle className="flex items-center gap-2 font-heading text-sm font-black tracking-wider text-[#101114] uppercase">
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
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {displayCategories.map((cat, idx) => {
              const num = String(idx + 1).padStart(2, "0");
              const img =
                cat.imageUrl ||
                FALLBACK_CATEGORY_IMAGES[cat.slug] ||
                "/images/categories/cat-t-shirts.jpg";
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

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                onClick={closeDrawer}
                className="flex flex-1 items-center justify-center gap-2 rounded-xs border border-black/15 py-2.5 text-center text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:bg-black/5"
              >
                <User className="size-3.5 text-[#101114]" />
                <span>MY ACCOUNT</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="cursor-pointer rounded-xs border border-black/15 px-3 py-2.5 text-xs font-bold tracking-wider text-black/60 uppercase transition-colors hover:bg-black/5 hover:text-black disabled:opacity-50"
              >
                {loggingOut ? "..." : "Sign Out"}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={closeDrawer}
              className="flex w-full items-center justify-center gap-2 rounded-xs border border-black/15 py-2.5 text-center text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:bg-black/5"
            >
              <User className="size-3.5 text-[#101114]" />
              <span>MY ACCOUNT</span>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
