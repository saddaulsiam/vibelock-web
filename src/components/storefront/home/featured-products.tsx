"use client";

import * as React from "react";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { cn } from "@/lib/utils";
import type { CategorySummary, ProductSummary } from "@/lib/catalog/types";

interface FeaturedProductsProps {
  products?: ProductSummary[];
  bestSellers?: ProductSummary[];
  categories?: CategorySummary[];
}

function toCardProduct(product: ProductSummary) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.minPrice,
    originalPrice: product.hasDiscount ? product.maxPrice : undefined,
    image: product.primaryImage?.url ?? "",
    badge: product.hasDiscount
      ? { label: "SALE", variant: "sale" as const }
      : { label: "NEW", variant: "sale" as const },
  };
}

export function FeaturedProducts({
  products,
  bestSellers,
  categories = [],
}: FeaturedProductsProps) {
  const allProducts = React.useMemo(() => products ?? bestSellers ?? [], [products, bestSellers]);
  const [activeTab, setActiveTab] = React.useState<string>("all");

  // Derive filter tabs: "ALL" first, then available category names/slugs
  const tabs = React.useMemo(() => {
    const list: { slug: string; label: string }[] = [{ slug: "all", label: "ALL" }];

    // If categories are passed in, use them; otherwise extract distinct categories from products
    const categorySource =
      categories.length > 0
        ? categories
        : Array.from(
            new Map(allProducts.flatMap((p) => p.categories || []).map((c) => [c.slug, c])).values()
          );

    categorySource.forEach((cat) => {
      const cleanName = cat.name
        .replace(/^\d+[.\s-]+/, "")
        .trim()
        .toUpperCase();
      if (!list.some((t) => t.slug === cat.slug)) {
        list.push({ slug: cat.slug, label: cleanName });
      }
    });

    return list;
  }, [categories, allProducts]);

  // Filter products by selected tab, capping at 8 for the 4x2 grid
  const displayedProducts = React.useMemo(() => {
    if (activeTab === "all") {
      return allProducts.slice(0, 8);
    }

    const tabSlug = activeTab.toLowerCase();
    const filtered = allProducts.filter((product) => {
      const hasCatMatch = product.categories?.some(
        (c) =>
          c.slug.toLowerCase() === tabSlug ||
          c.name.toLowerCase().includes(tabSlug) ||
          tabSlug.includes(c.slug.toLowerCase())
      );
      if (hasCatMatch) return true;

      // Fallback matching against product name or slug
      return (
        product.name.toLowerCase().includes(tabSlug) || product.slug.toLowerCase().includes(tabSlug)
      );
    });

    return filtered.slice(0, 8);
  }, [allProducts, activeTab]);

  const activeTabLabel = tabs.find((t) => t.slug === activeTab)?.label ?? "Category";

  return (
    <section className="border-t border-black/5 bg-white py-12 sm:py-16 lg:py-20">
      <Container>
        <SectionHeading
          eyebrow="FEATURED"
          title="EXPLORE OUR CATALOG"
          align="center"
          action={{ href: "/products", label: "View All" }}
        />

        {/* Filter Tabs (Pills) */}
        {tabs.length > 1 && (
          <div className="mt-7 flex [scrollbar-width:none] items-center justify-start gap-2 overflow-x-auto px-1 py-1 sm:mt-9 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:py-0 [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.slug;
              return (
                <button
                  key={tab.slug}
                  type="button"
                  onClick={() => setActiveTab(tab.slug)}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full px-4.5 py-1.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none sm:px-5 sm:py-2 sm:text-xs",
                    isActive
                      ? "border border-[#101114] bg-[#101114] text-white shadow-xs"
                      : "border border-[#101114]/30 bg-white text-[#101114] hover:border-[#101114] hover:bg-black/5"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 4-Column x 2-Row Grid (8 Cards) */}
        {displayedProducts.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={toCardProduct(product)} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xs border border-dashed border-[#101114]/20 bg-[#101114]/[0.02] px-4 py-16 text-center sm:mt-12">
            <p className="text-sm font-bold tracking-wider text-[#101114] uppercase">
              No products found in {activeTabLabel} yet
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              New drops are in production. Check back soon or browse all items.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className="mt-4 inline-flex cursor-pointer items-center rounded-xs bg-vl-black px-5 py-2 font-heading text-xs font-black tracking-widest text-vl-white uppercase transition-opacity hover:opacity-90"
            >
              Show All Products
            </button>
          </div>
        )}
      </Container>
    </section>
  );
}
