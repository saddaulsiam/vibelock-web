"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Package, Search, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PosCategory, PosProductSummary, PosProductVariant } from "@/lib/pos/pos-types";

interface PosProductGridProps {
  products: PosProductSummary[];
  categories: PosCategory[];
  onAddVariant: (variant: PosProductVariant, product: PosProductSummary) => void;
}

export function PosProductGrid({ products, categories, onAddVariant }: PosProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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
      {/* Category Pills & Quick Filter Bar */}
      <div className="space-y-2.5 border-b border-[#d6d2c4] bg-white p-3">
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter catalog by product name, SKU, color, or category..."
            className="focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/20 h-9 border-[#d6d2c4] bg-[#faf9f5] pr-8 pl-9 text-xs"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-vl-black absolute top-2.5 right-2.5 transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex scrollbar-thin items-center space-x-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-vl-black text-vl-cyan border-vl-cyan border font-bold shadow-xs"
                : "text-vl-black/80 bg-[#ebe6d9] hover:bg-[#d6d2c4]"
            }`}
          >
            All Items ({products.length})
          </button>
          {categories.map((cat) => {
            const count = categoryCounts[cat.id] ?? 0;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-vl-cyan text-vl-black font-heading font-black shadow-[0_0_12px_rgba(0,217,255,0.35)]"
                    : "text-vl-black/80 bg-[#ebe6d9] hover:bg-[#d6d2c4]"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
          {uncategorizedCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory("uncategorized")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === "uncategorized"
                  ? "bg-vl-cyan text-vl-black font-heading font-black shadow-[0_0_12px_rgba(0,217,255,0.35)]"
                  : "text-vl-black/80 bg-[#ebe6d9] hover:bg-[#d6d2c4]"
              }`}
            >
              Uncategorized ({uncategorizedCount})
            </button>
          )}
        </div>
      </div>

      {/* Product Cards Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
            <Package className="mb-2 h-10 w-10 stroke-1 text-slate-300" />
            <p className="text-sm font-medium">No products match your filter.</p>
            <p className="text-xs text-slate-400 mb-3">
              Try selecting a different category or search term.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="h-8 text-xs font-semibold border-[#d6d2c4] hover:bg-white"
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
                  className={`flex flex-col justify-between overflow-hidden rounded-lg border bg-white shadow-2xs transition-all ${
                    isOutOfStock
                      ? "border-[#d6d2c4] bg-[#f9f8f5] opacity-60"
                      : "hover:border-vl-cyan border-[#e2ded2] hover:shadow-[0_4px_20px_rgba(0,217,255,0.15)]"
                  }`}
                >
                  <div>
                    {/* Image / Thumbnail */}
                    <div className="relative h-28 w-full overflow-hidden bg-[#f2f2f2]">
                      {prod.imageUrl ? (
                        <Image
                          src={prod.imageUrl}
                          alt={prod.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Package className="h-8 w-8 stroke-1" />
                        </div>
                      )}

                      {/* Stock Badge */}
                      <div className="absolute top-1.5 right-1.5">
                        {isNoVariants ? (
                          <Badge variant="secondary" className="bg-slate-200 px-1.5 py-0 text-[10px] text-slate-600">
                            No Variants
                          </Badge>
                        ) : isOutOfStock ? (
                          <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                            Out of Stock
                          </Badge>
                        ) : prod.totalAvailableStock <= 3 ? (
                          <Badge className="bg-vl-cyan/20 border-vl-cyan/40 hover:bg-vl-cyan/20 border px-1.5 py-0 text-[10px] font-bold text-[#007994]">
                            Low: {prod.totalAvailableStock} left
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 px-1.5 py-0 text-[10px] font-medium text-white hover:bg-emerald-600">
                            Stock: {prod.totalAvailableStock}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-2.5">
                      <h4
                        className="text-vl-black line-clamp-1 text-xs leading-snug font-medium"
                        title={prod.name}
                      >
                        {prod.name}
                      </h4>

                      <div className="mt-1 flex items-baseline space-x-1">
                        {isNoVariants ? (
                          <span className="text-vl-grey text-xs font-medium">Unpriced</span>
                        ) : (
                          <>
                            <span className="font-heading text-vl-black text-sm font-black">
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
                  <div className="border-t border-[#f0ede6] bg-[#faf9f5] p-2 pt-0">
                    {isNoVariants ? (
                      <div className="flex h-8 items-center justify-center rounded border border-dashed border-[#d6d2c4] bg-[#f2f2f2] text-[11px] font-medium text-slate-400">
                        No Variants
                      </div>
                    ) : isSingleVariant ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isOutOfStock}
                        onClick={() => onAddVariant(prod.variants[0], prod)}
                        className="bg-vl-black hover:bg-vl-cyan hover:text-vl-black text-vl-white h-8 w-full text-xs font-bold transition-all"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add to Cart
                      </Button>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-vl-grey block text-[10px] font-semibold tracking-wider uppercase">
                          Select Variant:
                        </span>
                        <div className="grid grid-cols-2 gap-1">
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
                                className={`flex items-center justify-between truncate rounded border px-1.5 py-1 text-left text-[11px] transition-colors ${
                                  vOutOfStock
                                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through"
                                    : "hover:bg-vl-cyan/10 hover:border-vl-cyan text-vl-black border-[#d6d2c4] bg-white"
                                }`}
                              >
                                <span className="truncate">{label}</span>
                                <span
                                  className={`ml-1 font-mono text-[9px] ${
                                    v.availableStock <= 2
                                      ? "font-bold text-[#007994]"
                                      : "text-slate-500"
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
