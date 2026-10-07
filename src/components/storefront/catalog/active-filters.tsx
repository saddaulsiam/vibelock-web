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
    router.push(`${pathname || ""}?${params.toString()}`);
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
    router.push(`${pathname || ""}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-sm text-muted-foreground mr-2">Active Filters:</span>
      
      {q && (
        <Badge variant="secondary" className="flex items-center gap-1 hover:bg-secondary/80 text-sm py-1">
          Search: {q}
          <button onClick={() => removeFilter("q")} className="ml-1 hover:text-red-500">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {category && category.split(",").map((c) => (
        <Badge key={`cat-${c}`} variant="secondary" className="flex items-center gap-1 hover:bg-secondary/80 text-sm py-1">
          Category: {c}
          <button onClick={() => removeFilter("category", c)} className="ml-1 hover:text-red-500">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {size && size.split(",").map((s) => (
        <Badge key={`size-${s}`} variant="secondary" className="flex items-center gap-1 hover:bg-secondary/80 text-sm py-1">
          Size: {s}
          <button onClick={() => removeFilter("size", s)} className="ml-1 hover:text-red-500">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {color && color.split(",").map((c) => (
        <Badge key={`color-${c}`} variant="secondary" className="flex items-center gap-1 hover:bg-secondary/80 text-sm py-1">
          Color: {c}
          <button onClick={() => removeFilter("color", c)} className="ml-1 hover:text-red-500">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {(minPrice || maxPrice) && (
        <Badge variant="secondary" className="flex items-center gap-1 hover:bg-secondary/80 text-sm py-1">
          Price: {minPrice ? `৳${minPrice}` : "0"} - {maxPrice ? `৳${maxPrice}` : "Any"}
          <button onClick={() => { removeFilter("minPrice"); removeFilter("maxPrice"); }} className="ml-1 hover:text-red-500">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <button 
        onClick={clearAll}
        className="text-sm underline text-muted-foreground hover:text-foreground ml-2"
      >
        Clear all
      </button>
    </div>
  );
}
