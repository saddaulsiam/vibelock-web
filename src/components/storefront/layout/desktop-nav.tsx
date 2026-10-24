"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { CategoriesDrawer } from "./categories-drawer";
import type { CategorySummary } from "@/lib/catalog/types";

interface DesktopNavProps {
  categories?: CategorySummary[];
  isAuthenticated?: boolean;
}

export function DesktopNav({ categories = [], isAuthenticated = false }: DesktopNavProps) {
  const pathname = usePathname();

  const isShopActive = pathname === "/products" || pathname.startsWith("/products/");
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
      <div className="group relative flex items-center py-2">
        <Link
          href="/products"
          className={`flex items-center gap-1 transition-colors ${
            isShopActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
          }`}
        >
          <span>SHOP</span>
          <ChevronDown className="size-3 text-white/50 transition-transform group-hover:rotate-180" />
        </Link>
        {isShopActive && (
          <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#00D9FF]" />
        )}

        <div className="invisible absolute top-full left-0 z-50 min-w-44 rounded-2xl border border-black/10 bg-white p-2 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
          <Link
            href="/products"
            className="block rounded-lg px-3 py-2 text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114]"
          >
            All Products
          </Link>
          <Link
            href="/products?sort=newest"
            className="block rounded-lg px-3 py-2 text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114]"
          >
            New Arrivals
          </Link>
        </div>
      </div>

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
