"use client";

import { useCallback, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface FilterOptions {
  categories: { name: string; slug: string }[];
  sizes: string[];
  colors: string[];
}

interface ProductFiltersProps {
  options: FilterOptions;
  isMobile?: boolean;
  lockedCategorySlug?: string;
}

export function ProductFilters({ options, isMobile = false, lockedCategorySlug }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const navigateWithParams = useCallback(
    (params: URLSearchParams) => {
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
      if (isMobile) setOpen(false);
    },
    [isMobile, pathname, router]
  );

  const toggleArrayFilter = (name: "category" | "size" | "color", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const items = params.get(name)?.split(",").filter(Boolean) ?? [];
    const nextItems = items.includes(value)
      ? items.filter((item) => item !== value)
      : [...items, value];

    if (nextItems.length) params.set(name, nextItems.join(","));
    else params.delete(name);
    navigateWithParams(params);
  };

  const applyPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const minPrice = String(formData.get("minPrice") ?? "").trim();
    const maxPrice = String(formData.get("maxPrice") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");
    navigateWithParams(params);
  };

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchQuery = String(formData.get("q") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) params.set("q", searchQuery);
    else params.delete("q");
    navigateWithParams(params);
  };

  const selectedCategories = searchParams.get("category")?.split(",") ?? [];
  const selectedSizes = searchParams.get("size")?.split(",") ?? [];
  const selectedColors = searchParams.get("color")?.split(",") ?? [];
  const sortValue = searchParams.get("sort");
  const sort = sortValue === "name-asc" || sortValue === "name-desc" ? sortValue : "newest";

  const filterContent = (
    <div className="space-y-7">
      <section className="space-y-3" aria-labelledby="catalog-search-label">
        <h3 id="catalog-search-label" className="text-sm font-semibold">Search</h3>
        <form key={`search-${searchParams.toString()}`} onSubmit={applySearch} className="flex gap-2">
          <label className="sr-only" htmlFor={isMobile ? "mobile-catalog-search" : "catalog-search"}>
            Search products
          </label>
          <Input
            id={isMobile ? "mobile-catalog-search" : "catalog-search"}
            placeholder="Search products"
            name="q"
            defaultValue={searchParams.get("q") ?? ""}
          />
          <Button type="submit" size="icon" aria-label="Search products" className="h-9 w-10 bg-[#101114] text-white hover:bg-[#101114]/85">
            <Search aria-hidden="true" />
          </Button>
        </form>
      </section>

      <section className="space-y-3" aria-labelledby="catalog-sort-label">
        <h3 id="catalog-sort-label" className="text-sm font-semibold">Sort by</h3>
        <Select
          value={sort}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) params.set("sort", value);
            else params.delete("sort");
            navigateWithParams(params);
          }}
        >
          <SelectTrigger aria-label="Sort products" className="h-10 w-full rounded-sm border-[#101114]/20">
            <SelectValue placeholder="Sort products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="name-asc">Name: A to Z</SelectItem>
            <SelectItem value="name-desc">Name: Z to A</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {options.categories.length > 0 && (
        <section className="space-y-3" aria-labelledby="catalog-category-label">
          <h3 id="catalog-category-label" className="text-sm font-semibold">Category</h3>
          <div className="space-y-2.5">
            {options.categories.map((category) => (
              <label key={category.slug} className="flex min-h-6 cursor-pointer items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border accent-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
                  checked={selectedCategories.includes(category.slug) || category.slug === lockedCategorySlug}
                  disabled={category.slug === lockedCategorySlug}
                  onChange={() => toggleArrayFilter("category", category.slug)}
                />
                {category.name}
              </label>
            ))}
          </div>
        </section>
      )}

      {options.sizes.length > 0 && (
        <section className="space-y-3" aria-labelledby="catalog-size-label">
          <h3 id="catalog-size-label" className="text-sm font-semibold">Size</h3>
          <div className="flex flex-wrap gap-2">
            {options.sizes.map((size) => {
              const selected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleArrayFilter("size", size)}
                  className={`min-h-9 min-w-10 rounded-sm border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] ${
                    selected
                      ? "border-[#101114] bg-[#101114] text-white"
                      : "border-border bg-white hover:border-[#101114]"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {options.colors.length > 0 && (
        <section className="space-y-3" aria-labelledby="catalog-color-label">
          <h3 id="catalog-color-label" className="text-sm font-semibold">Color</h3>
          <div className="space-y-2.5">
            {options.colors.map((color) => (
              <label key={color} className="flex min-h-6 cursor-pointer items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border accent-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
                  checked={selectedColors.includes(color)}
                  onChange={() => toggleArrayFilter("color", color)}
                />
                {color}
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="catalog-price-label">
        <h3 id="catalog-price-label" className="text-sm font-semibold">Price range</h3>
        <form key={`price-${searchParams.toString()}`} onSubmit={applyPrice} className="space-y-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <label className="sr-only" htmlFor={isMobile ? "mobile-min-price" : "min-price"}>Minimum price</label>
          <Input
            id={isMobile ? "mobile-min-price" : "min-price"}
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Min"
            name="minPrice"
            defaultValue={searchParams.get("minPrice") ?? ""}
          />
          <span aria-hidden="true" className="text-muted-foreground">–</span>
          <label className="sr-only" htmlFor={isMobile ? "mobile-max-price" : "max-price"}>Maximum price</label>
          <Input
            id={isMobile ? "mobile-max-price" : "max-price"}
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Max"
            name="maxPrice"
            defaultValue={searchParams.get("maxPrice") ?? ""}
          />
          </div>
          <Button type="submit" variant="outline" className="h-10 w-full rounded-sm border-[#101114]/20">
            Apply price
          </Button>
        </form>
      </section>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-[#101114]/20 bg-white px-4 text-sm font-medium transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(88vw,24rem)] overflow-y-auto bg-white p-5">
          <SheetHeader className="mb-5 border-b border-border px-0 pb-4 pt-1">
            <SheetTitle className="text-left text-xl font-semibold">Filters & sort</SheetTitle>
          </SheetHeader>
          {filterContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside aria-label="Product filters" className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-24 border-r border-border pr-6">
        {filterContent}
      </div>
    </aside>
  );
}
