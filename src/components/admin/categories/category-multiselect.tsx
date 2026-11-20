"use client";

import * as React from "react";
import { Check, ChevronDown, FolderTree, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CategoryOption {
  id: string;
  name: string;
}

export interface CategoryMultiSelectProps {
  categories: CategoryOption[];
  initialSelectedIds?: string[];
  name?: string;
  placeholder?: string;
  onChange?: (selectedIds: string[]) => void;
}

export function CategoryMultiSelect({
  categories,
  initialSelectedIds = [],
  name = "categoryIds",
  placeholder = "Select categories...",
  onChange,
}: CategoryMultiSelectProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>(initialSelectedIds);
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [openUpwards, setOpenUpwards] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const updateSelected = (next: string[]) => {
    setSelectedIds(next);
    onChange?.(next);
  };

  const closeDropdown = React.useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const openDropdown = React.useCallback(() => {
    setHighlightedIndex(0);
    setIsOpen(true);
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

  // Restore focus to trigger button when dropdown closes
  const prevIsOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

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

  const totalItems = filteredCategories.length;

  const categoryIndexMap = React.useMemo(() => {
    const map = new Map<string, number>();
    filteredCategories.forEach((cat, idx) => {
      map.set(cat.id, idx);
    });
    return map;
  }, [filteredCategories]);

  // Auto-scroll list container to keep highlighted item in view
  React.useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const highlightedEl = listRef.current.querySelector<HTMLElement>(
        `[data-category-index="${highlightedIndex}"]`
      );
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const toggleCategory = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    updateSelected(next);
  };

  const removeCategory = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = selectedIds.filter((item) => item !== id);
    updateSelected(next);
  };

  const clearAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateSelected([]);
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredCategories.map((c) => c.id);
    const combined = Array.from(new Set([...selectedIds, ...filteredIds]));
    updateSelected(combined);
  };

  const deselectAllFiltered = () => {
    const filteredIdsSet = new Set(filteredCategories.map((c) => c.id));
    const next = selectedIds.filter((id) => !filteredIdsSet.has(id));
    updateSelected(next);
  };

  const areAllFilteredSelected =
    filteredCategories.length > 0 &&
    filteredCategories.every((cat) => selectedIds.includes(cat.id));

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setHighlightedIndex(0);
  };

  // Keyboard navigation inside search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (totalItems === 0) return;
      setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalItems === 0) return;
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < totalItems) {
        toggleCategory(filteredCategories[highlightedIndex].id);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      if (totalItems > 0) setHighlightedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      if (totalItems > 0) setHighlightedIndex(totalItems - 1);
    } else if (e.key === "Tab") {
      closeDropdown();
    }
  };

  // Keyboard navigation on trigger button
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
      }
    }
  };

  return (
    <div className="relative w-full space-y-1.5" ref={containerRef}>
      {/* Hidden inputs to feed formData for Next.js Server Actions */}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {/* Dropdown Trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        className="border-vl-dark-900/20 text-vl-dark-900 hover:border-vl-dark-900/40 focus-visible:ring-vl-cyan flex min-h-11 w-full items-center justify-between border bg-white px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <FolderTree className="text-vl-dark-900/40 size-4 shrink-0" />
          <span className="text-vl-dark-900 truncate font-medium">
            {selectedIds.length === 0
              ? placeholder
              : selectedIds.length === 1
                ? (categoryMap.get(selectedIds[0]) ?? selectedIds[0])
                : `${selectedIds.length} categories selected`}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {selectedIds.length > 0 && (
            <span className="bg-vl-dark-900 text-vl-white-300 rounded-xs px-1.5 py-0.5 text-[11px] font-semibold">
              {selectedIds.length}
            </span>
          )}
          <ChevronDown
            className={`text-vl-dark-900/60 size-4 transition-transform duration-200 ${
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
                className="group border-vl-dark-900/15 bg-vl-white-300 text-vl-dark-900 hover:border-vl-dark-900/30 inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors"
              >
                <span>{label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => removeCategory(id, e)}
                  title={`Remove ${label}`}
                  className="text-vl-dark-900/60 size-4 p-0 hover:bg-black/10 hover:text-red-700"
                >
                  <X className="size-3" />
                  <span className="sr-only">Remove {label}</span>
                </Button>
              </span>
            );
          })}

          {selectedIds.length > 1 && (
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={clearAll}
              className="text-muted-foreground h-auto p-0 text-xs underline underline-offset-2 hover:text-red-600"
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Dropdown Menu / Popover */}
      {isOpen && (
        <div
          className={`border-vl-dark-900/20 absolute left-0 z-50 w-full border bg-white shadow-2xl ${
            openUpwards ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {/* Search Bar */}
          <div className="border-vl-dark-900/10 bg-vl-white-200 border-b p-2.5">
            <div className="relative flex items-center">
              <Search className="text-vl-dark-900/40 pointer-events-none absolute left-3 z-10 size-4" />
              <Input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search categories..."
                size="sm"
                className="bg-white pr-8 pl-9"
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setQuery("");
                    setHighlightedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  className="text-vl-dark-900/40 hover:text-vl-dark-900 absolute right-2.5 z-10 size-4 p-0"
                >
                  <X className="size-3.5" />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}
            </div>
          </div>

          {/* Quick Selection Toolbar */}
          {categories.length > 0 && (
            <div className="text-muted-foreground border-vl-dark-900/10 flex items-center justify-between border-b bg-white px-3 py-1.5 text-[11px]">
              <span>
                {filteredCategories.length === categories.length
                  ? `${categories.length} categories`
                  : `Showing ${filteredCategories.length} of ${categories.length}`}
              </span>
              <div className="flex items-center gap-3">
                {filteredCategories.length > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={areAllFilteredSelected ? deselectAllFiltered : selectAllFiltered}
                    className="text-vl-dark-900 h-auto p-0 text-[11px] font-medium hover:underline"
                  >
                    {areAllFilteredSelected ? "Deselect matching" : "Select matching"}
                  </Button>
                )}
                {selectedIds.length > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={clearAll}
                    className="h-auto p-0 text-[11px] text-red-600 hover:underline"
                  >
                    Clear selection
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Categories List */}
          <div
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            className="divide-vl-dark-900/5 max-h-60 divide-y overflow-y-auto"
          >
            {filteredCategories.map((category) => {
              const itemIdx = categoryIndexMap.get(category.id) ?? 0;
              const isSelected = selectedIds.includes(category.id);
              const isHighlighted = highlightedIndex === itemIdx;

              return (
                <div
                  key={category.id}
                  role="option"
                  aria-selected={isSelected}
                  data-category-index={itemIdx}
                  onMouseEnter={() => setHighlightedIndex(itemIdx)}
                  onClick={() => toggleCategory(category.id)}
                  className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-xs transition-colors ${
                    isSelected
                      ? "bg-vl-white-300 text-vl-dark-900 font-semibold"
                      : isHighlighted
                        ? "bg-vl-white-300/60 text-vl-dark-900"
                        : "text-vl-dark-900 hover:bg-vl-white-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex size-4 items-center justify-center border transition-colors ${
                        isSelected
                          ? "border-vl-dark-900 bg-vl-dark-900 text-vl-white-300"
                          : "border-vl-dark-900/30 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="size-3 stroke-3" />}
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
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={() => {
                    setQuery("");
                    setHighlightedIndex(0);
                  }}
                  className="text-vl-cyan-700 dark:text-vl-cyan h-auto p-0 text-xs hover:underline"
                >
                  Clear filter
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
