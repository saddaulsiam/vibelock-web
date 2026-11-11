"use client";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { Button } from "@/components/ui/button";
import type { CategorySummary, ProductSummary } from "@/lib/catalog/types";
import * as React from "react";

interface FeaturedProductsProps {
  products?: ProductSummary[];
  bestSellers?: ProductSummary[];
  categories?: CategorySummary[];
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
      return allProducts.slice(0, 50);
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
          action={{ href: "/shop", label: "View All" }}
        />

        {/* Filter Tabs (Pills) */}
        {tabs.length > 1 && (
          <div className="mt-7 flex scrollbar-none items-center justify-start gap-2 overflow-x-auto px-1 py-1 sm:mt-9 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:py-0 [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.slug;
              return (
                <Button
                  key={tab.slug}
                  type="button"
                  variant={isActive ? "brand" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.slug)}
                  className="rounded-full px-5"
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* 4-Column x 2-Row Grid (8 Cards) */}
        {displayedProducts.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:mt-12 sm:grid-cols-3 sm:gap-4 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5">
            {displayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                badge={
                  product.hasDiscount
                    ? { label: "SALE", variant: "sale" }
                    : { label: "NEW", variant: "new" }
                }
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xs border border-dashed border-vl-dark-900/20 bg-vl-dark-900/2 px-4 py-16 text-center sm:mt-12">
            <p className="text-sm font-bold tracking-wider text-vl-dark-900 uppercase">
              No products found in {activeTabLabel} yet
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              New drops are in production. Check back soon or browse all items.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setActiveTab("all")}
              className="mt-4 px-5"
            >
              Show All Products
            </Button>
          </div>
        )}
      </Container>
    </section>
  );
}
