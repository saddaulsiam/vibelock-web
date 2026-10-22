"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";

export function DesktopNav() {
  const pathname = usePathname();

  const isShopActive = pathname === "/products";
  const isTshirtsActive = pathname === "/category/t-shirts";
  const isShirtsActive = pathname === "/category/shirts";
  const isPantsActive = pathname === "/category/pants";
  const isAboutActive = pathname === "/about";
  const isContactActive = pathname === "/contact";

  return (
    <nav
      aria-label="Main navigation"
      className="hidden items-center gap-4 text-xs font-bold tracking-wider text-white uppercase xl:flex 2xl:gap-6"
    >
      {/* ── 1. CATEGORIES (with Menu Icon ≡ CATEGORIES like screenshot) ── */}
      <div className="group relative py-2">
        <Link
          href="/category/t-shirts"
          className="flex items-center gap-1.5 text-white/75 transition-colors hover:text-white"
        >
          <Menu className="size-3.5 text-white/50" />
          <span>CATEGORIES</span>
        </Link>

        {/* Dropdown Card */}
        <div className="invisible absolute top-full left-0 z-50 min-w-44 rounded-2xl border border-black/10 bg-white p-2 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
          <Link
            href="/category/t-shirts"
            className="block rounded-lg px-3 py-2 text-xs font-medium text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114]"
          >
            T-Shirts
          </Link>
          <Link
            href="/category/shirts"
            className="block rounded-lg px-3 py-2 text-xs font-medium text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114]"
          >
            Shirts
          </Link>
          <Link
            href="/category/pants"
            className="block rounded-lg px-3 py-2 text-xs font-medium text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114]"
          >
            Pants
          </Link>
          <Link
            href="/category/shorts"
            className="block rounded-lg px-3 py-2 text-xs font-medium text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114]"
          >
            Shorts
          </Link>
        </div>
      </div>

      {/* ── 2. SHOP ── */}
      <div className="group relative py-2">
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
          <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#00D9FF]" />
        )}

        <div className="invisible absolute top-full left-0 z-50 min-w-44 rounded-2xl border border-black/10 bg-white p-2 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
          <Link
            href="/products"
            className="block rounded-lg px-3 py-2 text-xs font-medium text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114]"
          >
            All Products
          </Link>
          <Link
            href="/products?sort=newest"
            className="block rounded-lg px-3 py-2 text-xs font-medium text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114]"
          >
            New Arrivals
          </Link>
        </div>
      </div>

      {/* ── 3. Direct Category Shortcuts (like SNEAKERS / PERFUME in image) ── */}
      <Link
        href="/category/t-shirts"
        className={`group relative py-2 transition-colors ${
          isTshirtsActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
        }`}
      >
        <span>T-SHIRTS</span>
        {isTshirtsActive && (
          <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-[#00D9FF]" />
        )}
      </Link>

      <Link
        href="/category/shirts"
        className={`group relative py-2 transition-colors ${
          isShirtsActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
        }`}
      >
        <span>SHIRTS</span>
        {isShirtsActive && (
          <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-[#00D9FF]" />
        )}
      </Link>

      <Link
        href="/category/pants"
        className={`group relative py-2 transition-colors ${
          isPantsActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
        }`}
      >
        <span>PANTS</span>
        {isPantsActive && (
          <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-[#00D9FF]" />
        )}
      </Link>

      {/* ── 4. ABOUT & CONTACT ── */}
      <Link
        href="/about"
        className={`group relative py-2 transition-colors ${
          isAboutActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
        }`}
      >
        <span>ABOUT</span>
        {isAboutActive && (
          <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-[#00D9FF]" />
        )}
      </Link>

      <Link
        href="/contact"
        className={`group relative py-2 transition-colors ${
          isContactActive ? "text-[#00D9FF]" : "text-white/75 hover:text-white"
        }`}
      >
        <span>CONTACT</span>
        {isContactActive && (
          <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-[#00D9FF]" />
        )}
      </Link>
    </nav>
  );
}
