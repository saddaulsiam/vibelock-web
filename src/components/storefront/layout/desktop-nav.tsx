"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CategoriesDrawer } from "./categories-drawer";
import type { CategorySummary } from "@/lib/catalog/types";

interface DesktopNavProps {
  categories?: CategorySummary[];
  isAuthenticated?: boolean;
}

export function DesktopNav({ categories = [], isAuthenticated = false }: DesktopNavProps) {
  const pathname = usePathname();

  const isShopActive = pathname === "/shop" || pathname.startsWith("/shop/");
  const isTshirtsActive = pathname === "/category/t-shirts";
  const isShirtsActive = pathname === "/category/shirts";
  const isPantsActive = pathname === "/category/pants";

  return (
    <nav
      aria-label="Main navigation"
      className="hidden items-center gap-4 text-xs font-medium tracking-wider text-white uppercase xl:flex 2xl:gap-6"
    >
      {/* ── 1. CATEGORIES (Click opens categories sidebar like shared image) ── */}
      <div className="relative flex items-center py-2">
        <CategoriesDrawer categories={categories} isAuthenticated={isAuthenticated} />
      </div>

      {/* ── 2. SHOP ── */}
      <Link
        href="/shop"
        className={`group relative flex items-center py-2 transition-colors ${
          isShopActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
        }`}
      >
        <span>SHOP</span>
        {isShopActive && (
          <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#00D9FF]" />
        )}
      </Link>

      {/* ── 3. Direct Category Shortcuts (like SNEAKERS / PERFUME in image) ── */}
      <Link
        href="/category/t-shirts"
        className={`group relative flex items-center py-2 transition-colors ${
          isTshirtsActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
        }`}
      >
        <span>T-SHIRTS</span>
        {isTshirtsActive && (
          <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#00D9FF]" />
        )}
      </Link>

      <Link
        href="/category/shirts"
        className={`group relative flex items-center py-2 transition-colors ${
          isShirtsActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
        }`}
      >
        <span>SHIRTS</span>
        {isShirtsActive && (
          <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#00D9FF]" />
        )}
      </Link>

      <Link
        href="/category/pants"
        className={`group relative flex items-center py-2 transition-colors ${
          isPantsActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
        }`}
      >
        <span>PANTS</span>
        {isPantsActive && (
          <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#00D9FF]" />
        )}
      </Link>
    </nav>
  );
}
