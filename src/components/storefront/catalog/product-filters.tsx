"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface FilterCategory {
  id?: string;
  name: string;
  slug: string;
  parentId?: string | null;
}

export interface FilterOptions {
  categories: FilterCategory[];
  sizes: string[];
  colors: string[];
}

export interface ProductFiltersProps {
  options: FilterOptions;
  isMobile?: boolean;
  lockedCategorySlug?: string;
  totalCount?: number;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children: CategoryTreeNode[];
}

export const COLOR_HEX_MAP: Record<string, string> = {
  black: "#101114",
  white: "#FFFFFF",
  beige: "#d8c4b0",
  olive: "#556b2f",
  grey: "#80828d",
  gray: "#80828d",
  charcoal: "#2d3139",
  navy: "#1a2b49",
  blue: "#2563eb",
  sky: "#38bdf8",
  red: "#dc2626",
  maroon: "#800000",
  burgundy: "#722f37",
  green: "#16a34a",
  forest: "#14532d",
  brown: "#78350f",
  khaki: "#c3b091",
  tan: "#d2b48c",
  cream: "#fffdd0",
  sand: "#e2d4b7",
  orange: "#ea580c",
  pink: "#ec4899",
  rose: "#f43f5e",
  purple: "#7e22ce",
  violet: "#6d28d9",
  yellow: "#eab308",
  mustard: "#d97706",
  cyan: "#00d9ff",
  teal: "#0d9488",
};

function getSwatchColor(colorName: string): string {
  const key = colorName.toLowerCase().trim();
  if (COLOR_HEX_MAP[key]) return COLOR_HEX_MAP[key];
  for (const [k, v] of Object.entries(COLOR_HEX_MAP)) {
    if (key.includes(k)) return v;
  }
  return "#9ca3af";
}

const PRICE_RANGES = [
  { id: "all", label: "All Prices", min: undefined, max: undefined },
  { id: "under-500", label: "Under Tk 500", min: undefined, max: 500 },
  { id: "500-1000", label: "Tk 500 - Tk 1,000", min: 500, max: 1000 },
  { id: "1000-2000", label: "Tk 1,000 - Tk 2,000", min: 1000, max: 2000 },
  { id: "2000-5000", label: "Tk 2,000 - Tk 5,000", min: 2000, max: 5000 },
  { id: "above-5000", label: "Above Tk 5,000", min: 5000, max: undefined },
];

const VISIBLE_SIZE_LIMIT = 8;

function buildCategoryTree(categories: FilterCategory[]): CategoryTreeNode[] {
  const nodeMap = new Map<string, CategoryTreeNode>();
  const slugMap = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Create tree nodes
  categories.forEach((cat) => {
    const node: CategoryTreeNode = {
      id: cat.id || cat.slug,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId ?? null,
      children: [],
    };
    if (cat.id) nodeMap.set(cat.id, node);
    slugMap.set(cat.slug, node);
  });

  // Connect parent-child relations
  categories.forEach((cat) => {
    const node = (cat.id && nodeMap.get(cat.id)) || slugMap.get(cat.slug);
    if (!node) return;

    if (cat.parentId && (nodeMap.has(cat.parentId) || slugMap.has(cat.parentId))) {
      const parentNode = nodeMap.get(cat.parentId) || slugMap.get(cat.parentId);
      parentNode?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function getAncestorSlugs(activeSlug: string, categories: FilterCategory[]): Set<string> {
  const ancestors = new Set<string>();
  const nodeMap = new Map<string, FilterCategory>();
  const slugMap = new Map<string, FilterCategory>();

  categories.forEach((c) => {
    if (c.id) nodeMap.set(c.id, c);
    slugMap.set(c.slug, c);
  });

  let current = slugMap.get(activeSlug);
  while (current && current.parentId) {
    const parent = nodeMap.get(current.parentId) || slugMap.get(current.parentId);
    if (parent) {
      ancestors.add(parent.slug);
      current = parent;
    } else {
      break;
    }
  }

  return ancestors;
}

function CategoryTreeItem({
  node,
  level = 0,
  activeCategorySlug,
  isCategoryExpanded,
  onToggleExpand,
  onSelectCategory,
}: {
  node: CategoryTreeNode;
  level?: number;
  activeCategorySlug: string;
  isCategoryExpanded: (slug: string) => boolean;
  onToggleExpand: (slug: string) => void;
  onSelectCategory: (slug: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = isCategoryExpanded(node.slug);
  const isSelected = activeCategorySlug === node.slug;

  return (
    <div className="flex flex-col">
      <div className="group flex items-center justify-between py-1 transition-colors">
        <button
          type="button"
          onClick={() => onSelectCategory(node.slug)}
          className={cn(
            "text-left text-xs font-semibold tracking-wide uppercase transition-colors select-none",
            isSelected ? "text-vl-cyan" : "text-vl-dark-400 hover:text-vl-dark-900"
          )}
        >
          {node.name}
        </button>

        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.slug);
            }}
            aria-label={`Toggle ${node.name} subcategories`}
            className="text-vl-dark-500 hover:bg-vl-dark-200/80 flex size-6 cursor-pointer items-center justify-center rounded-full transition-all focus:outline-none"
          >
            <ChevronDown
              className={cn(
                "size-3.5 stroke-2 transition-transform duration-200 ease-out",
                isExpanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {/* Smoothly animated collapsible children container with relationship border line */}
      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            key={`branch-${node.slug}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-vl-dark-200 my-0.5 ml-1.5 flex flex-col border-l pl-3">
              {node.children.map((child) => (
                <CategoryTreeItem
                  key={child.slug}
                  node={child}
                  level={level + 1}
                  activeCategorySlug={activeCategorySlug}
                  isCategoryExpanded={isCategoryExpanded}
                  onToggleExpand={onToggleExpand}
                  onSelectCategory={onSelectCategory}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ColorSelectDropdown({
  colors,
  selectedColors,
  onToggleColor,
  onClearColors,
}: {
  colors: string[];
  selectedColors: string[];
  onToggleColor: (color: string) => void;
  onClearColors: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If space below is less than 280px, open upward so it doesn't get cut off
      setOpenUpward(spaceBelow < 280);
    }
    setIsOpen((prev) => {
      if (prev) setSearch("");
      return !prev;
    });
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return colors;
    const q = search.toLowerCase().trim();
    return colors.filter((c) => c.toLowerCase().includes(q));
  }, [colors, search]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex h-8 w-full cursor-pointer items-center justify-between rounded-none border bg-white px-3 text-xs transition-colors select-none",
          isOpen
            ? "border-vl-dark-900 ring-vl-dark-900/10 ring-1"
            : selectedColors.length > 0
              ? "border-vl-dark-900 text-vl-dark-900"
              : "border-vl-dark-200 text-vl-dark-700 hover:border-vl-dark-400"
        )}
      >
        <div className="flex min-w-0 items-center gap-2 pr-2">
          {selectedColors.length === 0 ? (
            <span className="text-vl-dark-500 font-medium">Select Colors...</span>
          ) : selectedColors.length === 1 ? (
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "size-3.5 shrink-0 rounded-full border",
                  ["white", "cream", "beige"].includes(selectedColors[0].toLowerCase())
                    ? "border-border/50"
                    : "border-black/15"
                )}
                style={{ backgroundColor: getSwatchColor(selectedColors[0]) }}
                aria-hidden="true"
              />
              <span className="text-vl-dark-900 truncate font-bold uppercase">
                {selectedColors[0]}
              </span>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="flex shrink-0 -space-x-1">
                {selectedColors.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="size-3.5 shrink-0 rounded-full border border-white"
                    style={{ backgroundColor: getSwatchColor(c) }}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-vl-dark-900 truncate font-bold uppercase">
                {selectedColors.length} Colors Selected
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {selectedColors.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClearColors();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onClearColors();
                }
              }}
              aria-label="Clear selected colors"
              className="text-vl-dark-400 hover:text-vl-dark-900 cursor-pointer p-0.5 transition-colors"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "text-vl-dark-500 size-3.5 stroke-2 transition-transform duration-200",
              isOpen && "text-vl-dark-900 rotate-180"
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Popover / Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "border-vl-dark-200 absolute left-0 z-50 w-full overflow-hidden rounded-none border bg-white shadow-2xl",
              openUpward ? "bottom-full mb-1" : "top-full mt-1"
            )}
          >
            {/* Search Input */}
            <div className="border-border/50 bg-vl-white-50 flex items-center gap-2 border-b px-2.5 py-2">
              <Search className="text-vl-dark-400 size-3.5 shrink-0" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search colors..."
                className="text-vl-dark-900 placeholder:text-vl-dark-400 w-full bg-transparent text-xs focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-vl-dark-400 hover:text-vl-dark-900 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Colors list */}
            <div className="vibelock-scrollbar max-h-56 space-y-0.5 overflow-y-auto p-1">
              {filtered.map((color) => {
                const selected = selectedColors.includes(color);
                const isWhiteOrLight = ["white", "cream", "beige", "sand"].includes(
                  color.toLowerCase().trim()
                );
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onToggleColor(color)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-none px-2.5 py-1.5 text-left text-xs transition-colors select-none",
                      selected
                        ? "bg-vl-dark-900 text-vl-white-50 font-bold"
                        : "text-vl-dark-700 hover:bg-vl-dark-100 hover:text-vl-dark-900 font-semibold"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "size-4 shrink-0 rounded-full border",
                          isWhiteOrLight ? "border-border/50" : "border-black/15"
                        )}
                        style={{ backgroundColor: getSwatchColor(color) }}
                        aria-hidden="true"
                      />
                      <span className="truncate tracking-wide uppercase">{color}</span>
                    </div>
                    {selected && (
                      <Check
                        className="text-vl-cyan size-3.5 shrink-0 stroke-[2.5]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-vl-dark-400 py-4 text-center text-xs">No colors found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProductFilters({
  options,
  isMobile = false,
  lockedCategorySlug,
  totalCount,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showCustomPrice, setShowCustomPrice] = useState(false);
  const [showAllSizes, setShowAllSizes] = useState(false);
  const [userExpandedOverrides, setUserExpandedOverrides] = useState<Record<string, boolean>>({});

  const navigateWithParams = useCallback(
    (params: URLSearchParams) => {
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
      if (isMobile) setOpen(false);
    },
    [isMobile, pathname, router]
  );

  const selectedCategories = searchParams.get("category")?.split(",").filter(Boolean) ?? [];
  const selectedSizes = searchParams.get("size")?.split(",").filter(Boolean) ?? [];
  const selectedColors = searchParams.get("color")?.split(",").filter(Boolean) ?? [];
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const searchQuery = searchParams.get("q")?.trim() ?? "";

  const activeCategorySlug = lockedCategorySlug || selectedCategories[0] || "";

  // Derive ancestor chain for the active category directly during render
  const activeAncestors = useMemo(() => {
    if (!activeCategorySlug) return new Set<string>();
    return getAncestorSlugs(activeCategorySlug, options.categories);
  }, [activeCategorySlug, options.categories]);

  const isCategoryExpanded = useCallback(
    (slug: string) => {
      if (userExpandedOverrides[slug] !== undefined) {
        return userExpandedOverrides[slug];
      }
      return activeAncestors.has(slug);
    },
    [activeAncestors, userExpandedOverrides]
  );

  const hasActiveFilters = Boolean(
    activeCategorySlug ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    minPriceParam ||
    maxPriceParam ||
    searchQuery
  );

  const activeFilterCount =
    (activeCategorySlug ? 1 : 0) +
    selectedSizes.length +
    selectedColors.length +
    (minPriceParam || maxPriceParam ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const activePriceRangeId = (() => {
    if (!minPriceParam && !maxPriceParam) return "all";
    if (!minPriceParam && maxPriceParam === "500") return "under-500";
    if (minPriceParam === "500" && maxPriceParam === "1000") return "500-1000";
    if (minPriceParam === "1000" && maxPriceParam === "2000") return "1000-2000";
    if (minPriceParam === "2000" && maxPriceParam === "5000") return "2000-5000";
    if (minPriceParam === "5000" && !maxPriceParam) return "above-5000";
    return "custom";
  })();

  const toggleAccordion = useCallback(
    (slug: string) => {
      setUserExpandedOverrides((prev) => {
        const currentlyExpanded = prev[slug] !== undefined ? prev[slug] : activeAncestors.has(slug);
        return {
          ...prev,
          [slug]: !currentlyExpanded,
        };
      });
    },
    [activeAncestors]
  );

  const handleSelectCategory = useCallback(
    (slug?: string) => {
      if (slug) {
        setUserExpandedOverrides((prev) => ({
          ...prev,
          [slug]: true,
        }));
      }
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      params.delete("page");
      const query = params.toString();

      if (slug) {
        router.push(query ? `/category/${slug}?${query}` : `/category/${slug}`);
      } else {
        router.push(query ? `/shop?${query}` : `/shop`);
      }
      if (isMobile) setOpen(false);
    },
    [isMobile, router, searchParams]
  );

  const handleSelectPriceRange = (range: (typeof PRICE_RANGES)[number]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (range.min !== undefined) {
      params.set("minPrice", String(range.min));
    } else {
      params.delete("minPrice");
    }

    if (range.max !== undefined) {
      params.set("maxPrice", String(range.max));
    } else {
      params.delete("maxPrice");
    }

    navigateWithParams(params);
  };

  const toggleArrayFilter = (name: "size" | "color", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const items = params.get(name)?.split(",").filter(Boolean) ?? [];
    const nextItems = items.includes(value)
      ? items.filter((item) => item !== value)
      : [...items, value];

    if (nextItems.length) params.set(name, nextItems.join(","));
    else params.delete(name);
    navigateWithParams(params);
  };

  const applyCustomPrice = (event: FormEvent<HTMLFormElement>) => {
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

  const handleClearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("size");
    params.delete("color");
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("q");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    if (isMobile) setOpen(false);
  };

  // Build category tree
  const categoryTree = buildCategoryTree(options.categories);

  const filterContent = (
    <div className="flex flex-col gap-5">
      {/* ── SECTION 1: CATEGORIES TREE ── */}
      {options.categories.length > 0 && (
        <section aria-labelledby="catalog-categories-heading">
          <div className="border-vl-dark-100 mb-1.5 flex items-center justify-between border-b pb-1.5">
            <h3
              id="catalog-categories-heading"
              className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase"
            >
              CATEGORIES
            </h3>
          </div>

          <div className="vibelock-scrollbar max-h-[calc(100vh-14rem)] overflow-y-auto pr-1.5">
            <div className="flex flex-col gap-0.5">
              {/* Top item: ALL CATEGORIES (with back arrow when a category is selected) */}
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => handleSelectCategory(undefined)}
                  className={cn(
                    "group flex items-center gap-1.5 text-left text-xs font-semibold tracking-wide uppercase transition-colors select-none",
                    !activeCategorySlug ? "text-vl-cyan" : "text-vl-dark-600 hover:text-vl-dark-900"
                  )}
                >
                  {activeCategorySlug ? (
                    <>
                      <ArrowLeft className="text-vl-dark-500 group-hover:text-vl-dark-900 size-3.5 transition-transform group-hover:-translate-x-0.5" />
                      <span>ALL CATEGORIES</span>
                    </>
                  ) : (
                    <span>ALL CATEGORIES</span>
                  )}
                </button>
              </div>

              {/* Tree Nodes */}
              {categoryTree.map((node) => (
                <CategoryTreeItem
                  key={node.slug}
                  node={node}
                  level={0}
                  activeCategorySlug={activeCategorySlug}
                  isCategoryExpanded={isCategoryExpanded}
                  onToggleExpand={toggleAccordion}
                  onSelectCategory={handleSelectCategory}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 2: PRICE RANGE ── */}
      <section aria-labelledby="catalog-price-heading">
        <h3
          id="catalog-price-heading"
          className="border-vl-dark-100 text-vl-dark-900 mb-1.5 border-b pb-1.5 text-xs font-bold tracking-wider uppercase"
        >
          PRICE RANGE
        </h3>

        <div className="space-y-1">
          {PRICE_RANGES.map((range) => {
            const isSelected = activePriceRangeId === range.id;
            return (
              <label
                key={range.id}
                className="group flex cursor-pointer items-center gap-2.5 py-0.5 text-xs select-none"
              >
                <input
                  type="radio"
                  name="priceRangeRadio"
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => handleSelectPriceRange(range)}
                />
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isSelected
                      ? "border-vl-cyan bg-white"
                      : "border-border/50 group-hover:border-vl-dark-900 bg-white"
                  )}
                  aria-hidden="true"
                >
                  {isSelected && <span className="bg-vl-cyan size-1.5 rounded-full" />}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide uppercase transition-colors",
                    isSelected ? "text-vl-cyan" : "text-vl-dark-400 group-hover:text-vl-dark-900"
                  )}
                >
                  {range.label}
                </span>
              </label>
            );
          })}

          {/* Optional Custom Price Input with smooth accordion */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowCustomPrice((prev) => !prev)}
              className="text-vl-dark-500 hover:text-vl-dark-900 flex cursor-pointer items-center gap-1 text-xs font-semibold tracking-wide uppercase transition-colors"
            >
              {showCustomPrice ? "— Hide Custom Range" : "+ Custom Price Range"}
            </button>

            <AnimatePresence initial={false}>
              {showCustomPrice && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <form
                    key={`custom-price-${minPriceParam}-${maxPriceParam}`}
                    onSubmit={applyCustomPrice}
                    className="mt-1.5 flex items-center gap-1.5"
                  >
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="Min"
                      name="minPrice"
                      defaultValue={minPriceParam ?? ""}
                      className="border-vl-dark-200 focus-visible:border-vl-dark-900 text-vl-dark-900 placeholder:text-vl-dark-400 focus-visible:ring-vl-dark-900/10 h-7.5 w-20 rounded-none bg-white px-2 text-xs focus-visible:ring-1"
                    />
                    <span className="text-vl-dark-400 text-xs">–</span>
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="Max"
                      name="maxPrice"
                      defaultValue={maxPriceParam ?? ""}
                      className="border-vl-dark-200 focus-visible:border-vl-dark-900 text-vl-dark-900 placeholder:text-vl-dark-400 focus-visible:ring-vl-dark-900/10 h-7.5 w-20 rounded-none bg-white px-2 text-xs focus-visible:ring-1"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="border-vl-dark-200 hover:border-vl-dark-900 hover:bg-vl-dark-900 hover:text-vl-white-50 h-7.5 rounded-none px-2.5 text-xs font-bold uppercase transition-colors"
                    >
                      Go
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: SIZES ── */}
      {options.sizes.length > 0 &&
        (() => {
          const hasHiddenSelected = options.sizes
            .slice(VISIBLE_SIZE_LIMIT)
            .some((s) => selectedSizes.includes(s));
          const isExpanded = showAllSizes || hasHiddenSelected;
          const displayedSizes = isExpanded
            ? options.sizes
            : options.sizes.slice(0, VISIBLE_SIZE_LIMIT);
          const hasMore = options.sizes.length > VISIBLE_SIZE_LIMIT;

          return (
            <section aria-labelledby="catalog-size-heading">
              <div className="border-vl-dark-100 mb-2.5 flex items-center justify-between border-b pb-1.5">
                <h3
                  id="catalog-size-heading"
                  className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase"
                >
                  SIZE
                </h3>
                {selectedSizes.length > 0 && (
                  <span className="text-vl-dark-400 text-xs font-semibold">
                    {selectedSizes.length} selected
                  </span>
                )}
              </div>

              <div
                className={cn(
                  "flex flex-wrap gap-1.5",
                  isExpanded &&
                    options.sizes.length > 12 &&
                    "vibelock-scrollbar max-h-44 overflow-y-auto pr-1"
                )}
              >
                {displayedSizes.map((size) => {
                  const selected = selectedSizes.includes(size);
                  return (
                    <Button
                      key={size}
                      type="button"
                      size="sm"
                      variant={selected ? "primary" : "outline"}
                      onClick={() => toggleArrayFilter("size", size)}
                      aria-pressed={selected}
                    >
                      {size}
                    </Button>
                  );
                })}
              </div>

              {hasMore && !hasHiddenSelected && (
                <button
                  type="button"
                  onClick={() => setShowAllSizes((prev) => !prev)}
                  className="text-vl-dark-500 hover:text-vl-dark-900 mt-1.5 flex cursor-pointer items-center gap-1 text-[11px] font-bold tracking-wider uppercase transition-colors"
                >
                  {isExpanded
                    ? "— Show Less"
                    : `+ Show More (${options.sizes.length - VISIBLE_SIZE_LIMIT})`}
                </button>
              )}
            </section>
          );
        })()}

      {/* ── SECTION 4: COLORS ── */}
      {options.colors.length > 0 && (
        <section aria-labelledby="catalog-color-heading">
          <div className="border-vl-dark-100 mb-2.5 flex items-center justify-between border-b pb-1.5">
            <h3
              id="catalog-color-heading"
              className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase"
            >
              COLOR
            </h3>
            {selectedColors.length > 0 && (
              <span className="text-vl-dark-400 text-xs font-semibold">
                {selectedColors.length} selected
              </span>
            )}
          </div>

          <ColorSelectDropdown
            colors={options.colors}
            selectedColors={selectedColors}
            onToggleColor={(c) => toggleArrayFilter("color", c)}
            onClearColors={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("color");
              navigateWithParams(params);
            }}
          />
        </section>
      )}

      {/* ── SECTION 5: CLEAR ALL FILTERS BUTTON ── */}
      {hasActiveFilters && (
        <div className="pt-1">
          <Button
            type="button"
            variant="primary"
            onClick={handleClearAllFilters}
            className="bg-vl-dark-900 text-vl-white-50 hover:bg-vl-dark-800 h-8 w-full rounded-none text-xs font-bold tracking-wider uppercase transition-all active:scale-[0.99]"
          >
            CLEAR ALL FILTERS
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="border-vl-dark-200 bg-vl-white-50 text-vl-dark-900 hover:bg-vl-white-200 inline-flex h-9 items-center justify-center gap-2 rounded-none border px-4 text-xs font-bold tracking-wider uppercase transition-colors focus-visible:outline-none">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          FILTERS
          {activeFilterCount > 0 && (
            <span className="bg-vl-cyan text-vl-dark-900 flex size-4 items-center justify-center rounded-full text-[10px] font-black">
              {activeFilterCount}
            </span>
          )}
        </SheetTrigger>
        <SheetContent
          side="left"
          className="bg-vl-white-50 vibelock-scrollbar w-[min(88vw,22rem)] overflow-y-auto p-5"
        >
          <SheetHeader className="border-vl-dark-100 mb-5 flex flex-row items-center justify-between border-b pb-3">
            <SheetTitle className="text-vl-dark-900 text-left text-xs font-black tracking-wider uppercase">
              FILTERS
            </SheetTitle>
            {totalCount !== undefined && (
              <span className="text-vl-dark-400 text-xs font-semibold">
                {totalCount} {totalCount === 1 ? "release" : "releases"}
              </span>
            )}
          </SheetHeader>
          {filterContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      aria-label="Product filters"
      className="relative z-20 hidden w-56 shrink-0 lg:block xl:w-64"
    >
      <div className="sticky top-24 pr-2">{filterContent}</div>
    </aside>
  );
}
