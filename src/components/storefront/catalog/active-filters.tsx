"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Extract relevant filter keys
  const category = searchParams.get("category");
  const size = searchParams.get("size");
  const color = searchParams.get("color");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const q = searchParams.get("q");

  const hasFilters = Boolean(category || size || color || minPrice || maxPrice || q);

  if (!hasFilters) return null;

  const removeFilter = (key: string, valueToRemove?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (valueToRemove && (key === "category" || key === "size" || key === "color")) {
      const current = params.get(key);
      if (current) {
        const items = current.split(",").filter((i) => i !== valueToRemove);
        if (items.length > 0) {
          params.set(key, items.join(","));
        } else {
          params.delete(key);
        }
      }
    } else {
      params.delete(key);
    }

    params.delete("page"); // Reset pagination
    const query = params.toString();
    router.push(query ? `${pathname || ""}?${query}` : pathname || "");
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    // Only delete discovery params, preserve others if any (like sort)
    params.delete("category");
    params.delete("size");
    params.delete("color");
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("q");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname || ""}?${query}` : pathname || "");
  };

  const clearPrice = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname || ""}?${query}` : pathname || "");
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
      <span className="mr-1 text-sm text-muted-foreground">Active filters</span>

      {q && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 py-1 text-sm"
        >
          Search: {q}
          <button type="button" onClick={() => removeFilter("q")} aria-label="Remove search filter" className="ml-1 rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
            <X className="size-3" aria-hidden="true" />
          </button>
        </Badge>
      )}

      {category &&
        category.split(",").map((c) => (
          <Badge
            key={`cat-${c}`}
            variant="secondary"
            className="flex items-center gap-1 hover:bg-secondary/80 text-sm py-1"
          >
            Category: {c}
            <button type="button" onClick={() => removeFilter("category", c)} aria-label={`Remove ${c} category filter`} className="ml-1 rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}

      {size &&
        size.split(",").map((s) => (
          <Badge
            key={`size-${s}`}
            variant="secondary"
            className="flex items-center gap-1 hover:bg-secondary/80 text-sm py-1"
          >
            Size: {s}
            <button type="button" onClick={() => removeFilter("size", s)} aria-label={`Remove ${s} size filter`} className="ml-1 rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}

      {color &&
        color.split(",").map((c) => (
          <Badge
            key={`color-${c}`}
            variant="secondary"
            className="flex items-center gap-1 hover:bg-secondary/80 text-sm py-1"
          >
            Color: {c}
            <button type="button" onClick={() => removeFilter("color", c)} aria-label={`Remove ${c} color filter`} className="ml-1 rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}

      {(minPrice || maxPrice) && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 py-1 text-sm"
        >
          Price: {minPrice ? `৳${minPrice}` : "0"} - {maxPrice ? `৳${maxPrice}` : "Any"}
          <button type="button" onClick={clearPrice} aria-label="Remove price filter" className="ml-1 rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
            <X className="size-3" aria-hidden="true" />
          </button>
        </Badge>
      )}

      <button
        onClick={clearAll}
        type="button"
        className="ml-2 min-h-9 rounded-sm px-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
      >
        Clear all
      </button>
    </div>
  );
}
