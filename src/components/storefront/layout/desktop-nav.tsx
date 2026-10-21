"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function DesktopNav() {
  const pathname = usePathname();

  const isHomeActive = pathname === "/";
  const isShopActive = pathname.startsWith("/products");
  const isCategoriesActive = pathname.startsWith("/category");
  const isAboutActive = pathname === "/about";
  const isContactActive = pathname === "/contact";

  return (
    <nav
      aria-label="Main navigation"
      className="hidden items-center gap-6 text-xs font-semibold tracking-wider text-[#F3F0E8] uppercase xl:flex 2xl:gap-8"
    >
      {/* ── HOME ── */}
      <Link
        href="/"
        className={`group relative flex flex-col items-center py-2 transition-colors ${
          isHomeActive ? "text-[#00D9FF]" : "text-[#F3F0E8]/80 hover:text-white"
        }`}
      >
        <span>HOME</span>
        {isHomeActive && (
          <span className="absolute -bottom-1 h-0.5 w-5 rounded-full bg-[#00D9FF]" />
        )}
      </Link>

      {/* ── SHOP (With Dropdown) ── */}
      <div className="group relative py-2">
        <Link
          href="/products"
          className={`flex items-center gap-1 transition-colors ${
            isShopActive ? "text-[#00D9FF]" : "text-[#F3F0E8]/80 hover:text-white"
          }`}
        >
          <span>SHOP</span>
          <ChevronDown
            className={`size-3 transition-transform group-hover:rotate-180 ${
              isShopActive ? "text-[#00D9FF]" : "text-[#F3F0E8]/60"
            }`}
          />
        </Link>
        {isShopActive && (
          <span className="absolute -bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#00D9FF]" />
        )}

        <div className="invisible absolute top-full left-0 z-50 min-w-44 border border-white/10 bg-[#101114] p-1.5 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
          <Link
            href="/products"
            className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            All Products
          </Link>
          <Link
            href="/products?sort=newest"
            className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            New Arrivals
          </Link>
        </div>
      </div>

      {/* ── CATEGORIES (With Dropdown) ── */}
      <div className="group relative py-2">
        <Link
          href="/category/t-shirts"
          className={`flex items-center gap-1 transition-colors ${
            isCategoriesActive ? "text-[#00D9FF]" : "text-[#F3F0E8]/80 hover:text-white"
          }`}
        >
          <span>CATEGORIES</span>
          <ChevronDown
            className={`size-3 transition-transform group-hover:rotate-180 ${
              isCategoriesActive ? "text-[#00D9FF]" : "text-[#F3F0E8]/60"
            }`}
          />
        </Link>
        {isCategoriesActive && (
          <span className="absolute -bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#00D9FF]" />
        )}

        <div className="invisible absolute top-full left-0 z-50 min-w-44 border border-white/10 bg-[#101114] p-1.5 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
          <Link
            href="/category/t-shirts"
            className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            T-Shirts
          </Link>
          <Link
            href="/category/shirts"
            className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Shirts
          </Link>
          <Link
            href="/category/pants"
            className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Pants
          </Link>
          <Link
            href="/category/shorts"
            className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Shorts
          </Link>
        </div>
      </div>

      {/* ── ABOUT ── */}
      <Link
        href="/about"
        className={`group relative flex flex-col items-center py-2 transition-colors ${
          isAboutActive ? "text-[#00D9FF]" : "text-[#F3F0E8]/80 hover:text-white"
        }`}
      >
        <span>ABOUT</span>
        {isAboutActive && (
          <span className="absolute -bottom-1 h-0.5 w-5 rounded-full bg-[#00D9FF]" />
        )}
      </Link>

      {/* ── CONTACT ── */}
      <Link
        href="/contact"
        className={`group relative flex flex-col items-center py-2 transition-colors ${
          isContactActive ? "text-[#00D9FF]" : "text-[#F3F0E8]/80 hover:text-white"
        }`}
      >
        <span>CONTACT</span>
        {isContactActive && (
          <span className="absolute -bottom-1 h-0.5 w-5 rounded-full bg-[#00D9FF]" />
        )}
      </Link>
    </nav>
  );
}
