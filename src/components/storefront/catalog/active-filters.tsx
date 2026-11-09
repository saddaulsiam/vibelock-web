"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <span className="text-vl-dark-400 mr-1 text-xs font-bold tracking-wider uppercase">
        Active filters:
      </span>

      {q && (
        <Badge
          variant="outline"
          className="border-vl-dark-200 bg-vl-white-50 text-vl-dark-900 flex items-center gap-1.5 rounded-none py-1 text-xs font-semibold uppercase"
        >
          Search: {q}
          <button
            type="button"
            onClick={() => removeFilter("q")}
            aria-label="Remove search filter"
            className="hover:text-status-error focus-visible:ring-vl-cyan ml-0.5 rounded-none focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </Badge>
      )}

      {category &&
        category.split(",").map((c) => (
          <Badge
            key={`cat-${c}`}
            variant="outline"
            className="border-vl-dark-200 bg-vl-white-50 text-vl-dark-900 flex items-center gap-1.5 rounded-none py-1 text-xs font-semibold uppercase"
          >
            {c.replace(/-/g, " ")}
            <button
              type="button"
              onClick={() => removeFilter("category", c)}
              aria-label={`Remove ${c} category filter`}
              className="hover:text-status-error focus-visible:ring-vl-cyan ml-0.5 rounded-none focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}

      {size &&
        size.split(",").map((s) => (
          <Badge
            key={`size-${s}`}
            variant="outline"
            className="border-vl-dark-200 bg-vl-white-50 text-vl-dark-900 flex items-center gap-1.5 rounded-none py-1 text-xs font-semibold uppercase"
          >
            Size: {s}
            <button
              type="button"
              onClick={() => removeFilter("size", s)}
              aria-label={`Remove ${s} size filter`}
              className="hover:text-status-error focus-visible:ring-vl-cyan ml-0.5 rounded-none focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}

      {color &&
        color.split(",").map((c) => (
          <Badge
            key={`color-${c}`}
            variant="outline"
            className="border-vl-dark-200 bg-vl-white-50 text-vl-dark-900 flex items-center gap-1.5 rounded-none py-1 text-xs font-semibold uppercase"
          >
            Color: {c}
            <button
              type="button"
              onClick={() => removeFilter("color", c)}
              aria-label={`Remove ${c} color filter`}
              className="hover:text-status-error focus-visible:ring-vl-cyan ml-0.5 rounded-none focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}

      {(minPrice || maxPrice) && (
        <Badge
          variant="outline"
          className="border-vl-dark-200 bg-vl-white-50 text-vl-dark-900 flex items-center gap-1.5 rounded-none py-1 text-xs font-semibold uppercase"
        >
          Price: {minPrice ? `Tk ${minPrice}` : "Tk 0"} - {maxPrice ? `Tk ${maxPrice}` : "Any"}
          <button
            type="button"
            onClick={clearPrice}
            aria-label="Remove price filter"
            className="hover:text-status-error focus-visible:ring-vl-cyan ml-0.5 rounded-none focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </Badge>
      )}

      <Button
        onClick={clearAll}
        type="button"
        variant="link"
        size="sm"
        className="text-vl-dark-400 hover:text-vl-dark-900 ml-1 text-xs font-bold tracking-wider uppercase"
      >
        Clear all
      </Button>
    </div>
  );
}
