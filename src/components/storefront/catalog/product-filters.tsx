"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import { SortOptionType } from "@/lib/catalog/validation";

interface FilterOptions {
  categories: { name: string; slug: string }[];
  sizes: string[];
  colors: string[];
}

interface ProductFiltersProps {
  options: FilterOptions;
  isMobile?: boolean;
}

export function ProductFilters({ options, isMobile = false }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for immediate input feedback before submitting
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.delete("page"); // Reset pagination on filter change
      return params.toString();
    },
    [searchParams]
  );

  const toggleArrayFilter = (name: string, value: string) => {
    const current = searchParams.get(name);
    const items = current ? current.split(",") : [];
    
    let newItems;
    if (items.includes(value)) {
      newItems = items.filter((i) => i !== value);
    } else {
      newItems = [...items, value];
    }
    
    router.push(`${pathname || ""}?${createQueryString(name, newItems.join(","))}`);
  };

  const handleApplyPrice = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");
    
    params.delete("page");
    router.push(`${pathname || ""}?${params.toString()}`);
  };

  const handleApplySearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`${pathname || ""}?${createQueryString("q", searchQuery)}`);
  };

  const currentCategories = searchParams.get("category")?.split(",") || [];
  const currentSizes = searchParams.get("size")?.split(",") || [];
  const currentSort = (searchParams.get("sort") as SortOptionType) || "newest";

  const FilterContent = (
    <div className="space-y-8">
      {/* Search */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Search</h3>
        <form onSubmit={handleApplySearch} className="flex gap-2">
          <Input 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" variant="secondary">Go</Button>
        </form>
      </div>

      {/* Sort */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Sort By</h3>
        <Select 
          value={currentSort} 
          onValueChange={(val) => router.push(`${pathname || ""}?${createQueryString("sort", val as string)}`)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest Arrivals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Categories */}
      {options.categories.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Category</h3>
          <div className="space-y-2">
            {options.categories.map((c) => (
              <label key={c.slug} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-brand-cyan focus:ring-brand-cyan"
                  checked={currentCategories.includes(c.slug)}
                  onChange={() => toggleArrayFilter("category", c.slug)}
                />
                <span className="text-sm">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Sizes */}
      {options.sizes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Size</h3>
          <div className="flex flex-wrap gap-2">
            {options.sizes.map((s) => {
              const isActive = currentSizes.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleArrayFilter("size", s)}
                  className={`px-3 py-1 text-sm border rounded-sm transition-colors ${
                    isActive ? "bg-brand-charcoal text-white border-brand-charcoal" : "hover:border-gray-400"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Price Range</h3>
        <div className="flex items-center gap-2">
          <Input 
            type="number" 
            placeholder="Min" 
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span>-</span>
          <Input 
            type="number" 
            placeholder="Max" 
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
        <Button onClick={handleApplyPrice} variant="secondary" className="w-full text-xs">
          Apply Price
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger>
          <Button variant="outline" className="w-full sm:w-auto">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters & Sort
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          {FilterContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-24">
        {FilterContent}
      </div>
    </div>
  );
}
