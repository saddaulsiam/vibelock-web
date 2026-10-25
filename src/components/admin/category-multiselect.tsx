"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, Plus, Search, Tag, X } from "lucide-react";

export type CategoryOption = {
  id: string;
  name: string;
};

interface CategoryMultiSelectProps {
  categories: CategoryOption[];
  initialSelectedIds?: string[];
  name?: string;
  placeholder?: string;
}

export function CategoryMultiSelect({
  categories,
  initialSelectedIds = [],
  name = "categoryIds",
  placeholder = "Select categories...",
}: CategoryMultiSelectProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>(initialSelectedIds);
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [openUpwards, setOpenUpwards] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const closeDropdown = React.useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  // Close dropdown on Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        closeDropdown();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeDropdown]);

  // Measure space and auto-flip upwards if near bottom of viewport
  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen) {
      // Small timeout to allow popover to render
      const timeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const categoryMap = React.useMemo(() => {
    return new Map(categories.map((cat) => [cat.id, cat.name]));
  }, [categories]);

  const filteredCategories = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, query]);

  const toggleCategory = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const removeCategory = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const clearAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds([]);
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredCategories.map((c) => c.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const deselectAllFiltered = () => {
    const filteredIdsSet = new Set(filteredCategories.map((c) => c.id));
    setSelectedIds((prev) => prev.filter((id) => !filteredIdsSet.has(id)));
  };

  const areAllFilteredSelected =
    filteredCategories.length > 0 &&
    filteredCategories.every((cat) => selectedIds.includes(cat.id));

  // Summary label for trigger
  const triggerSummary = React.useMemo(() => {
    if (selectedIds.length === 0) return null;
    if (selectedIds.length === 1) {
      return categoryMap.get(selectedIds[0]) ?? "1 category selected";
    }
    if (selectedIds.length === 2) {
      const first = categoryMap.get(selectedIds[0]);
      const second = categoryMap.get(selectedIds[1]);
      if (first && second) return `${first}, ${second}`;
    }
    return `${selectedIds.length} categories selected`;
  }, [selectedIds, categoryMap]);

  return (
    <div className="relative w-full space-y-2" ref={containerRef}>
      {/* Hidden inputs to feed formData for form action */}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {/* Dropdown Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            closeDropdown();
          } else {
            setIsOpen(true);
          }
        }}
        className="flex min-h-11 w-full items-center justify-between border border-[#101114]/20 bg-white px-3 py-2 text-left text-sm text-[#101114] transition-colors hover:border-[#101114]/40 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
      >
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <Tag className="size-4 shrink-0 text-[#101114]/50" />
          {triggerSummary ? (
            <span className="truncate font-medium text-[#101114]">{triggerSummary}</span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {selectedIds.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-xs bg-[#101114] px-1.5 py-0.5 text-[10px] font-semibold text-[#F3F0E8]">
              {selectedIds.length}
            </span>
          )}
          <ChevronDown
            className={`size-4 text-[#101114]/60 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Selected Tags / Badges below dropdown */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {selectedIds.map((id) => {
            const label = categoryMap.get(id) ?? id;
            return (
              <span
                key={id}
                className="group inline-flex items-center gap-1.5 border border-[#101114]/15 bg-[#F3F0E8] px-2.5 py-1 text-xs font-medium text-[#101114] transition-colors hover:border-[#101114]/30"
              >
                <span>{label}</span>
                <button
                  type="button"
                  onClick={(e) => removeCategory(id, e)}
                  title={`Remove ${label}`}
                  className="rounded-xs p-0.5 text-[#101114]/60 hover:bg-black/10 hover:text-red-700 focus-visible:ring-1 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                >
                  <X className="size-3" />
                  <span className="sr-only">Remove {label}</span>
                </button>
              </span>
            );
          })}

          {selectedIds.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-muted-foreground text-xs underline underline-offset-2 transition-colors hover:text-red-600 focus-visible:outline-none"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Dropdown Menu / Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-full border border-[#101114]/20 bg-white shadow-2xl ${
            openUpwards ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {/* Search Bar */}
          <div className="border-b border-[#101114]/10 bg-[#FBF9F5] p-2.5">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-[#101114]/40" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories..."
                className="placeholder:text-muted-foreground h-9 w-full border border-[#101114]/20 bg-white pr-8 pl-9 text-xs text-[#101114] transition-colors outline-none focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 text-[#101114]/40 hover:text-[#101114]"
                >
                  <X className="size-3.5" />
                  <span className="sr-only">Clear search</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Selection Toolbar */}
          {categories.length > 0 && (
            <div className="text-muted-foreground flex items-center justify-between border-b border-[#101114]/10 bg-white px-3 py-1.5 text-[11px]">
              <span>
                {filteredCategories.length === categories.length
                  ? `${categories.length} categories`
                  : `Showing ${filteredCategories.length} of ${categories.length}`}
              </span>
              <div className="flex items-center gap-3">
                {filteredCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={areAllFilteredSelected ? deselectAllFiltered : selectAllFiltered}
                    className="font-medium text-[#101114] hover:underline focus-visible:outline-none"
                  >
                    {areAllFilteredSelected ? "Deselect matching" : "Select matching"}
                  </button>
                )}
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-red-600 hover:underline focus-visible:outline-none"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Categories List */}
          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-60 divide-y divide-[#101114]/5 overflow-y-auto"
          >
            {filteredCategories.map((category) => {
              const isSelected = selectedIds.includes(category.id);
              return (
                <div
                  key={category.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleCategory(category.id)}
                  className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-xs transition-colors hover:bg-[#F3F0E8] ${
                    isSelected ? "bg-[#F3F0E8]/70 font-semibold text-[#101114]" : "text-[#101114]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex size-4 items-center justify-center border transition-colors ${
                        isSelected
                          ? "border-[#101114] bg-[#101114] text-[#F3F0E8]"
                          : "border-[#101114]/30 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </div>
                    <span>{category.name}</span>
                  </div>
                  {isSelected && (
                    <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Selected
                    </span>
                  )}
                </div>
              );
            })}

            {/* Empty filter results */}
            {filteredCategories.length === 0 && categories.length > 0 && (
              <div className="p-4 text-center">
                <p className="text-muted-foreground text-xs">
                  No categories found matching &quot;{query}&quot;
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-1.5 text-xs font-medium text-[#101114] underline hover:text-[#00D9FF]"
                >
                  Reset search
                </button>
              </div>
            )}

            {/* Zero categories created in database */}
            {categories.length === 0 && (
              <div className="space-y-2 p-4 text-center">
                <p className="text-muted-foreground text-xs">
                  No categories have been created yet.
                </p>
                <Link
                  href="/admin/categories/new"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#101114] underline hover:text-[#00D9FF]"
                >
                  <Plus className="size-3" />
                  Create a category
                </Link>
              </div>
            )}
          </div>

          {/* Footer note / close button */}
          <div className="text-muted-foreground flex items-center justify-between border-t border-[#101114]/10 bg-[#FBF9F5] px-3 py-2 text-[11px]">
            <span>Press Esc or click outside to close</span>
            <button
              type="button"
              onClick={closeDropdown}
              className="font-medium text-[#101114] hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
