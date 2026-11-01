"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import { Package, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PosCategory, PosProductSummary, PosProductVariant } from "@/lib/pos/pos-types";

interface PosProductGridProps {
  products: PosProductSummary[];
  categories: PosCategory[];
  onAddVariant: (variant: PosProductVariant, product: PosProductSummary) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function PosProductGrid({
  products,
  categories,
  onAddVariant,
  searchQuery = "",
  onClearSearch,
}: PosProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const targetScrollLeft = useRef<number>(0);
  const isAnimating = useRef<boolean>(false);
  const animationFrameId = useRef<number | null>(null);

  // Enable buttery-smooth momentum mouse wheel scrolling on categories bar
  useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;

    // Initialize target scroll position
    targetScrollLeft.current = el.scrollLeft;

    const animate = () => {
      if (!el) {
        isAnimating.current = false;
        return;
      }

      const maxScroll = el.scrollWidth - el.clientWidth;
      const target = Math.max(0, Math.min(maxScroll, targetScrollLeft.current));
      const current = el.scrollLeft;
      const diff = target - current;

      if (Math.abs(diff) < 0.5) {
        el.scrollLeft = target;
        isAnimating.current = false;
        animationFrameId.current = null;
        return;
      }

      // 0.16 easing factor provides silky, responsive 60fps/120fps glide
      el.scrollLeft = current + diff * 0.16;
      animationFrameId.current = requestAnimationFrame(animate);
    };

    const handleWheel = (e: WheelEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const isVertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
      const rawDelta = isVertical ? e.deltaY : e.deltaX;

      if (rawDelta === 0) return;

      // Normalize delta across browsers (Firefox lines mode vs pixels)
      let delta = rawDelta;
      if (e.deltaMode === 1) {
        delta *= 24;
      } else if (e.deltaMode === 2) {
        delta *= el.clientWidth;
      }

      e.preventDefault();

      targetScrollLeft.current = Math.max(0, Math.min(maxScroll, targetScrollLeft.current + delta));

      if (!isAnimating.current) {
        isAnimating.current = true;
        animationFrameId.current = requestAnimationFrame(animate);
      }
    };

    const handleScroll = () => {
      if (!isAnimating.current) {
        targetScrollLeft.current = el.scrollLeft;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("scroll", handleScroll);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Map parent categories to all their descendant category IDs (recursive multi-level support)
  const categoryDescendantsMap = useMemo(() => {
    const directChildren = new Map<string, string[]>();
    for (const cat of categories) {
      if (cat.parentId) {
        const existing = directChildren.get(cat.parentId) || [];
        existing.push(cat.id);
        directChildren.set(cat.parentId, existing);
      }
    }

    const descendants = new Map<string, Set<string>>();
    const getDescendants = (parentId: string): Set<string> => {
      if (descendants.has(parentId)) return descendants.get(parentId)!;
      const set = new Set<string>();
      const children = directChildren.get(parentId) || [];
      for (const childId of children) {
        set.add(childId);
        const subChildren = getDescendants(childId);
        for (const sid of subChildren) {
          set.add(sid);
        }
      }
      descendants.set(parentId, set);
      return set;
    };

    for (const cat of categories) {
      getDescendants(cat.id);
    }

    return descendants;
  }, [categories]);

  // Robust category matcher supporting multi-tier hierarchy and uncategorized items
  const isProductMatchingCategory = useMemo(() => {
    return (prod: PosProductSummary, catId: string): boolean => {
      if (catId === "all") return true;
      if (catId === "uncategorized") return prod.categoryIds.length === 0;

      // Direct category ID match
      if (prod.categoryIds.includes(catId)) return true;

      // Subcategory match (if current catId is a parent/ancestor category)
      const descSet = categoryDescendantsMap.get(catId);
      if (descSet && prod.categoryIds.some((cid) => descSet.has(cid))) {
        return true;
      }

      return false;
    };
  }, [categoryDescendantsMap]);

  // Precompute accurate product counts per category and uncategorized items (cached for fast keystroke typing)
  const { categoryCounts, uncategorizedCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = 0;
    }
    let uncat = 0;

    for (const prod of products) {
      if (prod.categoryIds.length === 0) {
        uncat++;
      }
      for (const cat of categories) {
        if (isProductMatchingCategory(prod, cat.id)) {
          counts[cat.id] = (counts[cat.id] || 0) + 1;
        }
      }
    }
    return { categoryCounts: counts, uncategorizedCount: uncat };
  }, [categories, products, isProductMatchingCategory]);

  // Filter products by category and multi-token search (name, SKU, color, size, or category)
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory = isProductMatchingCategory(prod, selectedCategory);
      if (!matchesCategory) return false;

      const trimmed = searchQuery.trim().toLowerCase();
      if (!trimmed) return true;

      const tokens = trimmed.split(/\s+/).filter(Boolean);
      return tokens.every((token) => {
        const inName = prod.name.toLowerCase().includes(token);
        const inCategory = prod.categoryNames.some((c) => c.toLowerCase().includes(token));
        const inVariant = prod.variants.some((v) => {
          const sku = v.sku.toLowerCase();
          const color = v.color?.toLowerCase() ?? "";
          const size = v.size?.toLowerCase() ?? "";
          return sku.includes(token) || color.includes(token) || size.includes(token);
        });
        return inName || inCategory || inVariant;
      });
    });
  }, [products, selectedCategory, searchQuery, isProductMatchingCategory]);

  return (
    <div className="flex h-full flex-col border-r border-[#d6d2c4] bg-[#f2f2f2]">
      {/* Categories Bar (Scrollbar hidden, horizontal mouse wheel scrollable) */}
      <div className="border-b border-[#d6d2c4] bg-white px-3 py-2.5 shadow-2xs">
        <div
          ref={categoryScrollRef}
          className="no-scrollbar flex [scrollbar-width:none] items-center space-x-2 overflow-x-auto px-1 pt-0.5 pb-0.5 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center rounded-full px-3.5 py-1.5 text-xs whitespace-nowrap transition-all duration-150 ${
              selectedCategory === "all"
                ? "border-vl-cyan bg-vl-black font-heading text-vl-cyan border font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                : "text-vl-black/80 hover:border-vl-cyan/60 hover:text-vl-black border border-[#e2ded2] bg-white font-medium shadow-2xs"
            }`}
          >
            <span>All Items</span>
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                selectedCategory === "all"
                  ? "bg-vl-cyan/20 text-vl-cyan"
                  : "text-vl-black/70 bg-[#f0ede6]"
              }`}
            >
              {products.length}
            </span>
          </button>
          {categories.map((cat) => {
            const count = categoryCounts[cat.id] ?? 0;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center rounded-full px-3.5 py-1.5 text-xs whitespace-nowrap transition-all duration-150 ${
                  isSelected
                    ? "border-vl-cyan bg-vl-black font-heading text-vl-cyan border font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                    : "text-vl-black/80 hover:border-vl-cyan/60 hover:text-vl-black border border-[#e2ded2] bg-white font-medium shadow-2xs"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    isSelected ? "bg-vl-cyan/20 text-vl-cyan" : "text-vl-black/70 bg-[#f0ede6]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {uncategorizedCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory("uncategorized")}
              className={`flex items-center rounded-full px-3.5 py-1.5 text-xs whitespace-nowrap transition-all duration-150 ${
                selectedCategory === "uncategorized"
                  ? "border-vl-cyan bg-vl-black font-heading text-vl-cyan border font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                  : "text-vl-black/80 hover:border-vl-cyan/60 hover:text-vl-black border border-[#e2ded2] bg-white font-medium shadow-2xs"
              }`}
            >
              <span>Uncategorized</span>
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                  selectedCategory === "uncategorized"
                    ? "bg-vl-cyan/20 text-vl-cyan"
                    : "text-vl-black/70 bg-[#f0ede6]"
                }`}
              >
                {uncategorizedCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Product Cards Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e2ded2] bg-white shadow-2xs">
              <Package className="h-7 w-7 stroke-1 text-slate-400" />
            </div>
            <p className="font-heading text-vl-black text-sm font-bold">
              No products match your filter.
            </p>
            <p className="text-vl-grey mt-1 mb-3 text-xs">
              Try selecting a different category or search term.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClearSearch?.();
                setSelectedCategory("all");
              }}
              className="hover:border-vl-cyan h-8 rounded-lg border-[#d6d2c4] text-xs font-semibold hover:bg-white"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((prod) => {
              const isNoVariants = prod.variants.length === 0;
              const isSingleVariant = prod.variants.length === 1;
              const isOutOfStock = isNoVariants || prod.totalAvailableStock <= 0;

              return (
                <div
                  key={prod.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-2xs transition-all duration-200 ${
                    isOutOfStock
                      ? "border-[#e2ded2] bg-[#f9f8f5] opacity-60"
                      : "hover:border-vl-cyan border-[#e2ded2] hover:shadow-[0_8px_24px_rgba(0,217,255,0.14)]"
                  }`}
                >
                  <div>
                    {/* Image / Thumbnail with smooth zoom on hover */}
                    <div className="relative h-36 w-full overflow-hidden bg-[#f2f2f2]">
                      {prod.imageUrl ? (
                        <Image
                          src={prod.imageUrl}
                          alt={prod.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Package className="h-9 w-9 stroke-1 text-slate-300" />
                        </div>
                      )}

                      {/* Floating Glassmorphic Stock Badge */}
                      <div className="absolute top-2 right-2">
                        {isNoVariants ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full border border-slate-300 bg-white/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 shadow-xs backdrop-blur-md"
                          >
                            No Variants
                          </Badge>
                        ) : isOutOfStock ? (
                          <Badge
                            variant="destructive"
                            className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs"
                          >
                            Out of Stock
                          </Badge>
                        ) : prod.totalAvailableStock <= 3 ? (
                          <Badge className="border-vl-cyan/60 bg-vl-black/85 text-vl-cyan rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold shadow-[0_0_10px_rgba(0,217,255,0.25)] backdrop-blur-md">
                            Low: {prod.totalAvailableStock} left
                          </Badge>
                        ) : (
                          <Badge className="bg-vl-black/80 text-vl-white rounded-full border border-white/20 px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs backdrop-blur-md">
                            Stock: {prod.totalAvailableStock}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <h4
                        className="font-heading text-vl-black group-hover:text-vl-cyan line-clamp-1 text-xs leading-snug font-bold transition-colors"
                        title={prod.name}
                      >
                        {prod.name}
                      </h4>

                      <div className="mt-1.5 flex items-baseline space-x-1.5">
                        {isNoVariants ? (
                          <span className="text-vl-grey text-xs font-medium">Unpriced</span>
                        ) : (
                          <>
                            <span className="font-heading text-vl-black text-base font-black tracking-tight">
                              ৳{prod.minPrice.toFixed(0)}
                            </span>
                            {prod.maxPrice > prod.minPrice && (
                              <span className="text-vl-grey text-[11px] font-normal">
                                - ৳{prod.maxPrice.toFixed(0)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Variants Action Area */}
                  <div className="border-t border-[#f0ede6] bg-[#faf9f5] p-2.5">
                    {isNoVariants ? (
                      <div className="flex h-9 items-center justify-center rounded-lg border border-dashed border-[#d6d2c4] bg-[#f2f2f2] text-xs font-medium text-slate-400">
                        No Variants
                      </div>
                    ) : isSingleVariant ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isOutOfStock}
                        onClick={() => onAddVariant(prod.variants[0], prod)}
                        className="bg-vl-black font-heading text-vl-white hover:bg-vl-cyan hover:text-vl-black h-9 w-full rounded-lg text-xs font-black tracking-wider shadow-xs transition-all hover:shadow-[0_0_14px_rgba(0,217,255,0.3)] active:scale-[0.98]"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add to Cart
                      </Button>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="text-vl-grey block text-[10px] font-bold tracking-wider uppercase">
                          Select Variant:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {prod.variants.map((v) => {
                            const vOutOfStock = v.availableStock <= 0;
                            const label = [v.size, v.color].filter(Boolean).join(" / ") || v.sku;

                            return (
                              <button
                                key={v.id}
                                type="button"
                                disabled={vOutOfStock}
                                onClick={() => onAddVariant(v, prod)}
                                title={`${label} - Stock: ${v.availableStock}`}
                                className={`flex items-center justify-between truncate rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition-all ${
                                  vOutOfStock
                                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through"
                                    : "text-vl-black hover:border-vl-cyan hover:bg-vl-cyan/10 hover:text-vl-black border-[#d6d2c4] bg-white active:scale-[0.97]"
                                }`}
                              >
                                <span className="truncate">{label}</span>
                                <span
                                  className={`ml-1 font-mono text-[10px] font-bold ${
                                    v.availableStock <= 2 ? "text-[#008ba8]" : "text-slate-500"
                                  }`}
                                >
                                  {v.availableStock}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
