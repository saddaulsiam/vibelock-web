"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Package, Search, Plus } from "lucide-react";
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

  // Filter products by category and text search
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory =
        selectedCategory === "all" || prod.categoryIds.includes(selectedCategory);

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const nameMatch = prod.name.toLowerCase().includes(q);
      const skuMatch = prod.variants.some((v) => v.sku.toLowerCase().includes(q));
      return nameMatch || skuMatch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#f2f2f2] border-r border-[#d6d2c4]">
      {/* Category Pills & Quick Filter Bar */}
      <div className="p-3 bg-white border-b border-[#d6d2c4] space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter catalog by product name..."
            className="pl-9 h-9 text-xs bg-[#faf9f5] border-[#d6d2c4] focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/20"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-vl-black text-vl-cyan border border-vl-cyan shadow-xs font-bold"
                : "bg-[#ebe6d9] text-vl-black/80 hover:bg-[#d6d2c4]"
            }`}
          >
            All Items ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryIds.includes(cat.id)).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-vl-cyan text-vl-black font-heading font-black shadow-[0_0_12px_rgba(0,217,255,0.35)]"
                    : "bg-[#ebe6d9] text-vl-black/80 hover:bg-[#d6d2c4]"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Cards Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
            <Package className="h-10 w-10 text-slate-300 mb-2 stroke-1" />
            <p className="text-sm font-medium">No products match your filter.</p>
            <p className="text-xs text-slate-400">Try selecting a different category or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((prod) => {
              const isSingleVariant = prod.variants.length === 1;
              const isOutOfStock = prod.totalAvailableStock <= 0;

              return (
                <div
                  key={prod.id}
                  className={`bg-white rounded-lg border flex flex-col justify-between overflow-hidden transition-all shadow-2xs ${
                    isOutOfStock
                      ? "border-[#d6d2c4] opacity-60 bg-[#f9f8f5]"
                      : "border-[#e2ded2] hover:border-vl-cyan hover:shadow-[0_4px_20px_rgba(0,217,255,0.15)]"
                  }`}
                >
                  <div>
                    {/* Image / Thumbnail */}
                    <div className="relative h-28 w-full bg-[#f2f2f2] overflow-hidden">
                      {prod.imageUrl ? (
                        <Image
                          src={prod.imageUrl}
                          alt={prod.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                          <Package className="h-8 w-8 stroke-1" />
                        </div>
                      )}

                      {/* Stock Badge */}
                      <div className="absolute top-1.5 right-1.5">
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Out of Stock
                          </Badge>
                        ) : prod.totalAvailableStock <= 3 ? (
                          <Badge className="bg-vl-cyan/20 text-[#007994] border border-vl-cyan/40 text-[10px] px-1.5 py-0 font-bold hover:bg-vl-cyan/20">
                            Low: {prod.totalAvailableStock} left
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0 font-medium">
                            Stock: {prod.totalAvailableStock}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-2.5">
                      <h4
                        className="font-medium text-xs text-vl-black line-clamp-1 leading-snug"
                        title={prod.name}
                      >
                        {prod.name}
                      </h4>

                      <div className="mt-1 flex items-baseline space-x-1">
                        <span className="text-sm font-heading font-black text-vl-black">
                          ৳{prod.minPrice.toFixed(0)}
                        </span>
                        {prod.maxPrice > prod.minPrice && (
                          <span className="text-[11px] text-vl-grey font-normal">
                            - ৳{prod.maxPrice.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Variants Action Area */}
                  <div className="p-2 pt-0 border-t border-[#f0ede6] bg-[#faf9f5]">
                    {isSingleVariant ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isOutOfStock}
                        onClick={() => onAddVariant(prod.variants[0], prod)}
                        className="w-full h-8 text-xs bg-vl-black hover:bg-vl-cyan hover:text-vl-black text-vl-white transition-all font-bold"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add to Cart
                      </Button>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-vl-grey block tracking-wider">
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
                                className={`text-[11px] px-1.5 py-1 rounded border text-left truncate transition-colors flex items-center justify-between ${
                                  vOutOfStock
                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                                    : "bg-white hover:bg-vl-cyan/10 hover:border-vl-cyan border-[#d6d2c4] text-vl-black"
                                }`}
                              >
                                <span className="truncate">{label}</span>
                                <span
                                  className={`text-[9px] font-mono ml-1 ${
                                    v.availableStock <= 2 ? "text-[#007994] font-bold" : "text-slate-500"
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
