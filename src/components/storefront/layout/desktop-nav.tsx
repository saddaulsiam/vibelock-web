"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useRef } from "react";
import { CategoriesDrawer } from "./categories-drawer";
import { CategoryMegaMenu } from "./category-mega-menu";
import { getCategoryMegaMenuData } from "./mega-menu-data";
import type { CategorySummary } from "@/lib/catalog/types";

interface DesktopNavProps {
  categories?: CategorySummary[];
  isAuthenticated?: boolean;
}

export function DesktopNav({ categories = [], isAuthenticated = false }: DesktopNavProps) {
  const pathname = usePathname();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isShopActive = pathname === "/shop" || pathname.startsWith("/shop/");

  // Dynamically derive top root categories ordered strictly by Priority (Starting from 1: 1, 2, 3...)
  const navCategories = useMemo(() => {
    if (categories.length > 0) {
      // Find root categories (where parentId is null or empty)
      // Prioritize numbers starting from 1 (1, 2, 3...). Unranked items (<= 0 or null) are placed at the end.
      const roots = categories
        .filter((c) => !c.parentId)
        .sort((a, b) => {
          const orderA = a.sortOrder && a.sortOrder >= 1 ? a.sortOrder : Number.MAX_SAFE_INTEGER;
          const orderB = b.sortOrder && b.sortOrder >= 1 ? b.sortOrder : Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });

      if (roots.length > 0) {
        return roots.slice(0, 5).map((c) => ({
          slug: c.slug,
          label: c.name
            .replace(/^\d+[.\s-]+/, "")
            .trim()
            .toUpperCase(),
        }));
      }
    }
    // Fallback only if database is completely empty / unseeded
    return [
      { slug: "t-shirts", label: "T-SHIRTS" },
      { slug: "shirts", label: "SHIRTS" },
      { slug: "pants", label: "PANTS" },
    ];
  }, [categories]);

  // Smooth hover intent handlers (Only opens if category actually HAS subcategories in DB)
  const handleMouseEnter = (slug: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const subCats = getCategoryMegaMenuData(slug, categories);
    if (subCats && subCats.length > 0) {
      setHoveredCategory(slug);
    } else {
      setHoveredCategory(null);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setHoveredCategory(null);
    }, 180);
  };

  const handleKeepOpen = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHoveredCategory(null);
  };

  const activeSubCategories = useMemo(() => {
    if (!hoveredCategory) return [];
    return getCategoryMegaMenuData(hoveredCategory, categories) ?? [];
  }, [hoveredCategory, categories]);

  const activeCategoryName = useMemo(() => {
    if (!hoveredCategory) return "";
    return (
      navCategories.find((c) => c.slug === hoveredCategory)?.label ?? hoveredCategory.toUpperCase()
    );
  }, [hoveredCategory, navCategories]);

  return (
    <nav
      aria-label="Main navigation"
      className="hidden items-center gap-3 text-xs font-semibold tracking-wider text-white uppercase lg:flex xl:gap-5 2xl:gap-6"
    >
      {/* ── 1. CATEGORIES (Drawer Trigger) ── */}
      <div className="relative flex items-center py-2">
        <CategoriesDrawer categories={categories} isAuthenticated={isAuthenticated} />
      </div>

      {/* ── 2. SHOP ── */}
      <Link
        href="/shop"
        className={`group relative flex items-center py-2 transition-colors ${
          isShopActive ? "text-vl-cyan" : "text-white/75 hover:text-white"
        }`}
      >
        <span>SHOP</span>
        {isShopActive && (
          <span className="bg-vl-cyan absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full" />
        )}
      </Link>

      {/* ── 3. Dynamic Category Shortcuts with Hover Mega-Menu ── */}
      {navCategories.map((cat) => {
        const isActive =
          pathname === `/category/${cat.slug}` || pathname.startsWith(`/category/${cat.slug}/`);
        const isHovered = hoveredCategory === cat.slug;

        return (
          <div
            key={cat.slug}
            onMouseEnter={() => handleMouseEnter(cat.slug)}
            onMouseLeave={handleMouseLeave}
            className="relative flex items-center py-2"
          >
            <Link
              href={`/category/${cat.slug}`}
              onClick={handleClose}
              className={`group relative flex items-center py-2 transition-colors ${
                isActive || isHovered ? "text-vl-cyan" : "text-white/75 hover:text-white"
              }`}
            >
              <span>{cat.label}</span>
              {(isActive || isHovered) && (
                <span className="bg-vl-cyan absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full transition-all" />
              )}
            </Link>
          </div>
        );
      })}

      {/* ── 4. Floating Mega-Menu Flyout ── */}
      <CategoryMegaMenu
        isOpen={Boolean(hoveredCategory && activeSubCategories.length > 0)}
        categoryName={activeCategoryName}
        categorySlug={hoveredCategory ?? ""}
        subCategories={activeSubCategories}
        onMouseEnter={handleKeepOpen}
        onMouseLeave={handleMouseLeave}
        onClose={handleClose}
      />
    </nav>
  );
}
