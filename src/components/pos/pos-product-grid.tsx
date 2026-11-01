"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Package, Plus, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AdminTableInfiniteScroll } from "@/components/admin/shared";
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
  const [activePickerProduct, setActivePickerProduct] = useState<PosProductSummary | null>(null);
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

  // Infinite scroll pagination setup (batch-size 24 for lightning-fast DOM rendering)
  const PAGE_SIZE = 24;
  const filterKey = `${selectedCategory}::${searchQuery}`;
  const [prevFilterKey, setPrevFilterKey] = useState<string>(filterKey);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Adjust pagination during render when category or search changes (React recommended pattern)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const hasMore = visibleCount < filteredProducts.length;

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredProducts.length));
      setIsLoadingMore(false);
    }, 150);
  }, [isLoadingMore, hasMore, filteredProducts.length]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleProducts.map((prod) => {
                const isNoVariants = prod.variants.length === 0;
                const isSingleVariant = prod.variants.length === 1;
                const isOutOfStock = isNoVariants || prod.totalAvailableStock <= 0;

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (isOutOfStock) return;
                      if (isSingleVariant) {
                        onAddVariant(prod.variants[0], prod);
                      } else {
                        setActivePickerProduct(prod);
                      }
                    }}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-2xs transition-all duration-200 ${
                      isOutOfStock
                        ? "cursor-not-allowed border-[#e2ded2] bg-[#f9f8f5] opacity-60"
                        : "hover:border-vl-cyan cursor-pointer border-[#e2ded2] hover:shadow-[0_8px_24px_rgba(0,217,255,0.14)] active:scale-[0.99]"
                    }`}
                  >
                    <div>
                      {/* Image / Thumbnail with smooth zoom on hover */}
                      <div className="relative h-40 w-full overflow-hidden bg-[#f4f2ec]">
                        {prod.imageUrl ? (
                          <Image
                            src={prod.imageUrl}
                            alt={prod.name}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <Package className="h-9 w-9 stroke-1 text-slate-300" />
                          </div>
                        )}

                        {/* Floating Category Pill */}
                        {prod.categoryNames && prod.categoryNames.length > 0 && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className="inline-block max-w-[110px] truncate rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-2xs backdrop-blur-xs">
                              {prod.categoryNames[0]}
                            </span>
                          </div>
                        )}

                        {/* Floating Glassmorphic Stock Badge */}
                        <div className="absolute top-2 right-2 z-10">
                          {isNoVariants ? (
                            <Badge
                              variant="secondary"
                              className="rounded-full border border-slate-300 bg-white/95 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 shadow-xs backdrop-blur-md"
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
                            <Badge className="border-vl-cyan/60 bg-vl-black/90 text-vl-cyan rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold shadow-[0_0_10px_rgba(0,217,255,0.25)] backdrop-blur-md">
                              Low: {prod.totalAvailableStock} left
                            </Badge>
                          ) : (
                            <Badge className="bg-vl-black/85 text-vl-white rounded-full border border-white/20 px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs backdrop-blur-md">
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

                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="flex items-baseline space-x-1.5">
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
                          {!isNoVariants && !isSingleVariant && (
                            <span className="text-vl-grey font-mono text-[10px] font-medium">
                              {prod.variants.length} vars
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Uniform Action Row (Refined Boutique POS Outline Design) */}
                    <div className="p-3 pt-0">
                      {isNoVariants ? (
                        <div className="flex h-9.5 w-full items-center justify-center rounded-xl border border-dashed border-[#d6d2c4] bg-[#f9f8f5] text-xs font-medium text-slate-400">
                          No Variants
                        </div>
                      ) : isSingleVariant ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddVariant(prod.variants[0], prod);
                          }}
                          className="group/btn font-heading text-vl-black hover:border-vl-cyan hover:bg-vl-cyan/10 hover:text-vl-black relative flex h-9.5 w-full items-center justify-center gap-1.5 rounded-xl border border-[#d6d2c4] bg-white text-xs font-bold shadow-2xs transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,217,255,0.2)] active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                        >
                          <Plus className="group-hover/btn:text-vl-black h-3.5 w-3.5 text-slate-500 transition-transform duration-200 group-hover/btn:rotate-90" />
                          <span>Add to Cart</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePickerProduct(prod);
                          }}
                          className="group/btn font-heading text-vl-black hover:border-vl-cyan hover:bg-vl-cyan/10 hover:text-vl-black relative flex h-9.5 w-full items-center justify-between rounded-xl border border-[#d6d2c4] bg-white px-3 text-xs font-bold shadow-2xs transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,217,255,0.2)] active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                        >
                          <span className="flex items-center gap-1.5">
                            <Layers className="group-hover/btn:text-vl-black h-3.5 w-3.5 text-slate-500 transition-colors" />
                            <span>Select Variant:</span>
                          </span>
                          <span className="group-hover/btn:bg-vl-cyan/30 group-hover/btn:text-vl-black rounded-md bg-[#f0ede6] px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 transition-colors">
                            {prod.variants.length}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Infinite Scroll Sentinel & Load More Controls */}
            <AdminTableInfiniteScroll
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
              loadedCount={visibleProducts.length}
              totalCount={filteredProducts.length}
              itemName="products"
              className="border-t border-[#d6d2c4]/50 pt-2 pb-6"
            />
          </div>
        )}
      </div>

      {/* Quick Variant Picker Dialog for Multi-Variant Products */}
      <Dialog
        open={!!activePickerProduct}
        onOpenChange={(open) => {
          if (!open) setActivePickerProduct(null);
        }}
      >
        <DialogContent className="w-full gap-0 overflow-hidden rounded-2xl border border-[#d6d2c4] bg-white p-0 shadow-2xl sm:max-w-xl md:max-w-2xl">
          {activePickerProduct && (
            <div>
              {/* Header Preview */}
              <div className="flex items-center gap-3.5 border-b border-[#e2ded2] bg-[#fbfaf7] p-4 sm:p-5">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[#e2ded2] bg-white shadow-2xs sm:h-20 sm:w-20">
                  {activePickerProduct.imageUrl ? (
                    <Image
                      src={activePickerProduct.imageUrl}
                      alt={activePickerProduct.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Package className="h-8 w-8 stroke-1 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <DialogHeader className="space-y-0.5 text-left">
                    <DialogTitle className="font-heading text-vl-black line-clamp-1 text-base font-bold sm:text-lg">
                      {activePickerProduct.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Tap a variant below to add to POS ticket
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="font-heading text-vl-black text-sm font-black sm:text-base">
                      ৳{activePickerProduct.minPrice.toFixed(0)}
                      {activePickerProduct.maxPrice > activePickerProduct.minPrice && (
                        <span className="text-vl-grey text-xs font-normal sm:text-sm">
                          {" "}
                          - ৳{activePickerProduct.maxPrice.toFixed(0)}
                        </span>
                      )}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-xs font-medium text-slate-600">
                      Total Stock: {activePickerProduct.totalAvailableStock}
                    </span>
                  </div>
                </div>
              </div>

              {/* Variants Touch Grid */}
              <div className="max-h-[440px] overflow-y-auto p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                  {activePickerProduct.variants.map((v) => {
                    const vOutOfStock = v.availableStock <= 0;
                    const label = [v.size, v.color].filter(Boolean).join(" / ") || v.sku;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={vOutOfStock}
                        onClick={() => {
                          onAddVariant(v, activePickerProduct);
                          setActivePickerProduct(null);
                        }}
                        className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                          vOutOfStock
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-50"
                            : "hover:border-vl-cyan hover:bg-vl-cyan/5 border-[#e2ded2] bg-white hover:shadow-xs active:scale-[0.98]"
                        }`}
                      >
                        <div className="flex w-full items-start justify-between gap-1">
                          <span className="font-heading text-vl-black group-hover:text-vl-cyan truncate text-xs font-bold">
                            {label}
                          </span>
                          <span className="font-heading text-vl-black shrink-0 text-xs font-black">
                            ৳{v.effectivePrice.toFixed(0)}
                          </span>
                        </div>

                        <div className="mt-2.5 flex w-full items-center justify-between text-[11px]">
                          <span className="max-w-[100px] truncate font-mono text-[10px] text-slate-400">
                            {v.sku}
                          </span>
                          {vOutOfStock ? (
                            <span className="font-mono text-[10px] font-bold text-red-500">
                              Out of stock
                            </span>
                          ) : v.availableStock <= 2 ? (
                            <span className="font-mono text-[10px] font-bold text-amber-600">
                              Low: {v.availableStock}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] font-semibold text-emerald-600">
                              {v.availableStock} in stock
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
