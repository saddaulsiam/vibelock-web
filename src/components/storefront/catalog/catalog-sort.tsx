"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface CatalogSortProps {
  currentSort?: string;
  className?: string;
}

export function CatalogSort({ currentSort = "newest", className }: CatalogSortProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeSort = searchParams.get("sort") || currentSort || "newest";

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <span className="text-vl-dark-400 text-[11px] font-bold tracking-wider uppercase select-none">
        SORT BY:
      </span>
      <div className="relative inline-block">
        <select
          aria-label="Sort products"
          value={activeSort}
          onChange={handleSortChange}
          className="border-vl-dark-200 text-vl-dark-900 hover:border-vl-dark-400 focus:border-vl-dark-900 focus:ring-vl-dark-900/10 dark:border-vl-dark-600 dark:bg-vl-dark-800 dark:text-vl-white-300 h-8.5 w-44 cursor-pointer appearance-none rounded-none border bg-white py-1.5 pr-8 pl-3 text-xs font-semibold transition-colors focus:ring-1 focus:outline-none"
        >
          <option value="newest">New Releases</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
        <ChevronDown
          className="text-vl-dark-500 dark:text-vl-white-300 pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 stroke-2"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
