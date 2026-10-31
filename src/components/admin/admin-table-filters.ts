"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface BuildFilterUrlOptions {
  /** Current URL search params string or URLSearchParams instance */
  currentSearchParams?: string | URLSearchParams;
  /** Key-value updates to apply. Values of null, undefined, "", "ALL", or "all" are deleted */
  updates: Record<string, string | number | null | undefined>;
  /** Optional base path, e.g. "/admin/orders". If omitted, returns query string with leading "?" */
  basePath?: string;
  /** Key for pagination to be reset on filter change. Defaults to "page" */
  pageKey?: string;
}

/**
 * Pure function to construct the next URL when filters or search terms change.
 * Automatically deletes page number to prevent invalid pagination offset on filtered results.
 */
export function buildFilterUrl({
  currentSearchParams = "",
  updates,
  basePath = "",
  pageKey = "page",
}: BuildFilterUrlOptions): string {
  const params = new URLSearchParams(currentSearchParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === "ALL" ||
      value === "all"
    ) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  // Always reset pagination when filters or search change
  if (pageKey) {
    params.delete(pageKey);
  }

  const queryString = params.toString();
  if (!queryString) {
    return basePath || "";
  }
  return basePath ? `${basePath}?${queryString}` : `?${queryString}`;
}

export interface UseAdminTableUrlFiltersOptions {
  /** Initial search query string, usually from searchParams */
  initialSearch?: string;
  /** Key for search parameter in query string, defaults to "q" */
  searchKey?: string;
  /** Custom base pathname to navigate to. Defaults to current pathname */
  basePath?: string;
  /** Debounce delay for search input in milliseconds. Defaults to 350ms */
  debounceMs?: number;
  /** Whether to bind keyboard shortcut '/' to focus search input. Defaults to true */
  enableKeyboardShortcut?: boolean;
  /** Key for pagination to be reset on filter change. Defaults to "page" */
  pageKey?: string;
}

/**
 * Standard reusable hook for managing URL-driven search and filter state in Admin tables.
 *
 * Provides:
 * - Local debounced search with automatic URL synchronization
 * - '/' keyboard shortcut handler to focus the search input
 * - URL query parameter updates with automatic page reset to 1
 * - Filter reset handler
 * - Non-blocking transition support (isPending)
 */
export function useAdminTableUrlFilters(options: UseAdminTableUrlFiltersOptions = {}) {
  const {
    initialSearch = "",
    searchKey = "q",
    basePath,
    debounceMs = 350,
    enableKeyboardShortcut = true,
    pageKey = "page",
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const [searchTerm, setSearchTerm] = React.useState(initialSearch);
  const [prevInitialSearch, setPrevInitialSearch] = React.useState(initialSearch);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync state if initialSearch prop changes externally
  if (initialSearch !== prevInitialSearch) {
    setPrevInitialSearch(initialSearch);
    setSearchTerm(initialSearch);
  }

  // Keyboard shortcut '/' to focus search input
  React.useEffect(() => {
    if (!enableKeyboardShortcut || typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardShortcut]);

  // Push updates to URL search params
  const updateFilters = React.useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const targetPath = basePath ?? pathname;
      const url = buildFilterUrl({
        currentSearchParams: searchParams?.toString() ?? "",
        updates,
        basePath: targetPath,
        pageKey,
      });

      startTransition(() => {
        router.push(url);
      });
    },
    [basePath, pageKey, pathname, router, searchParams]
  );

  const updateFilter = React.useCallback(
    (key: string, value: string | number | null | undefined) => {
      updateFilters({ [key]: value });
    },
    [updateFilters]
  );

  // Debounced search change
  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearchTerm(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        updateFilter(searchKey, value.trim() ? value.trim() : null);
      }, debounceMs);
    },
    [debounceMs, searchKey, updateFilter]
  );

  // Instant clear search
  const handleClearSearch = React.useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSearchTerm("");
    updateFilter(searchKey, null);
  }, [searchKey, updateFilter]);

  // Full reset of filters
  const resetFilters = React.useCallback(
    (keysToPreserve?: string[]) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setSearchTerm("");

      const current = new URLSearchParams(searchParams?.toString() ?? "");
      const newParams = new URLSearchParams();

      if (keysToPreserve) {
        for (const key of keysToPreserve) {
          const val = current.get(key);
          if (val) newParams.set(key, val);
        }
      }

      const targetPath = basePath ?? pathname;
      const query = newParams.toString();
      const url = query ? `${targetPath}?${query}` : targetPath;

      startTransition(() => {
        router.push(url);
      });
    },
    [basePath, pathname, router, searchParams]
  );

  return {
    searchTerm,
    setSearchTerm,
    handleSearchChange,
    handleClearSearch,
    searchInputRef,
    updateFilter,
    updateFilters,
    resetFilters,
    isPending,
  };
}
