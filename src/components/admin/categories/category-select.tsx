"use client";

import * as React from "react";
import { Check, ChevronDown, FolderTree, Search, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface CategorySearchableSelectProps {
  categories: { id: string; name: string }[];
  currentCategoryId?: string;
  value: string;
  onChange: (id: string) => void;
  name?: string;
  placeholder?: string;
}

export function CategorySearchableSelect({
  categories,
  currentCategoryId,
  value,
  onChange,
  name = "parentId",
  placeholder = "Select parent category...",
}: CategorySearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [openUpwards, setOpenUpwards] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Exclude current category so a category cannot be its own parent
  const availableCategories = React.useMemo(() => {
    return categories.filter((cat) => cat.id !== currentCategoryId);
  }, [categories, currentCategoryId]);

  const categoryMap = React.useMemo(() => {
    return new Map(availableCategories.map((cat) => [cat.id, cat.name]));
  }, [availableCategories]);

  const filteredCategories = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableCategories;
    return availableCategories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [availableCategories, query]);

  // All selectable items including top-level root option at index 0
  const selectableItems = React.useMemo(() => {
    return [
      { id: "", name: "No parent (Top-level category)" },
      ...filteredCategories,
    ];
  }, [filteredCategories]);

  const itemIndexMap = React.useMemo(() => {
    const map = new Map<string, number>();
    selectableItems.forEach((item, idx) => {
      map.set(item.id, idx);
    });
    return map;
  }, [selectableItems]);

  const totalItems = selectableItems.length;
  const selectedCategoryName = value ? categoryMap.get(value) : null;

  const closeDropdown = React.useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const openDropdown = React.useCallback(() => {
    const selectedIdx = itemIndexMap.get(value);
    setHighlightedIndex(selectedIdx !== undefined ? selectedIdx : 0);
    setIsOpen(true);
  }, [itemIndexMap, value]);

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

  const handleSelect = (id: string) => {
    onChange(id);
    closeDropdown();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

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
        handleSelect(selectableItems[highlightedIndex].id);
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
      {/* Hidden input to feed formData for Next.js Server Actions */}
      <input type="hidden" name={name} value={value} />

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
          {value ? (
            <Tag className="text-vl-dark-900/60 size-4 shrink-0" />
          ) : (
            <FolderTree className="text-vl-dark-900/40 size-4 shrink-0" />
          )}

          {value ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-vl-dark-900 truncate font-semibold">
                {selectedCategoryName ?? value}
              </span>
              <span className="bg-vl-dark-900/5 text-vl-dark-900/70 shrink-0 rounded-xs px-1.5 py-0.5 text-[10px] font-semibold">
                Sub-category
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-vl-dark-900 truncate font-medium">
                No parent (Top-level category)
              </span>
              <span className="shrink-0 rounded-xs bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                Root
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {value ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
              title="Reset to top-level category"
              className="text-vl-dark-900/50 focus-visible:ring-vl-cyan rounded-xs p-1 hover:bg-black/10 hover:text-red-700 focus-visible:ring-1 focus-visible:outline-none"
            >
              <X className="size-3.5" />
              <span className="sr-only">Reset to top-level</span>
            </span>
          ) : null}
          <ChevronDown
            className={`text-vl-dark-900/60 size-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className={`border-vl-dark-900/20 absolute left-0 z-50 w-full border bg-white shadow-2xl ${
            openUpwards ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {/* Search Box */}
          <div className="border-vl-dark-900/10 bg-vl-white-200 border-b p-2.5">
            <div className="relative flex items-center">
              <Search className="text-vl-dark-900/40 pointer-events-none absolute left-3 z-10 size-4" />
              <Input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder={placeholder}
                size="sm"
                className="bg-white pr-8 pl-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setHighlightedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  className="text-vl-dark-900/40 hover:text-vl-dark-900 absolute right-2.5 z-10"
                >
                  <X className="size-3.5" />
                  <span className="sr-only">Clear search</span>
                </button>
              )}
            </div>
          </div>

          {/* Available count info */}
          <div className="text-muted-foreground border-vl-dark-900/10 flex items-center justify-between border-b bg-white px-3 py-1.5 text-[11px]">
            <span>
              {filteredCategories.length === availableCategories.length
                ? `${availableCategories.length} categories available`
                : `${filteredCategories.length} matching of ${availableCategories.length}`}
            </span>
            {query && <span>Filtered by &ldquo;{query}&rdquo;</span>}
          </div>

          {/* Options List */}
          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {/* Top-Level / Root Option (Index 0) */}
            <button
              type="button"
              data-category-index={0}
              onMouseEnter={() => setHighlightedIndex(0)}
              onClick={() => handleSelect("")}
              className={`border-vl-dark-900/10 flex w-full items-center justify-between border-b px-3 py-2.5 text-left text-xs transition-colors ${
                value === "" || highlightedIndex === 0
                  ? "bg-vl-dark-900/10 text-vl-dark-900 font-semibold"
                  : "text-vl-dark-900 hover:bg-vl-white-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderTree className="text-vl-dark-900/60 size-4 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-vl-dark-900 font-semibold">
                      No parent (Top-level category)
                    </span>
                    <span className="py-0.2 rounded-xs bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-800">
                      Root
                    </span>
                  </div>
                  <span className="text-muted-foreground block text-[11px]">
                    Main category visible directly in storefront header navigation
                  </span>
                </div>
              </div>
              {value === "" && <Check className="text-vl-cyan size-4" />}
            </button>

            {/* Filtered Parent Categories */}
            {filteredCategories.length > 0 ? (
              <ul className="divide-vl-dark-900/5 divide-y py-1">
                {filteredCategories.map((cat) => {
                  const itemIdx = itemIndexMap.get(cat.id) ?? 0;
                  const isSelected = value === cat.id;
                  const isHighlighted = highlightedIndex === itemIdx;

                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        data-category-index={itemIdx}
                        onMouseEnter={() => setHighlightedIndex(itemIdx)}
                        onClick={() => handleSelect(cat.id)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                          isSelected || isHighlighted
                            ? "bg-vl-dark-900/10 text-vl-dark-900 font-semibold"
                            : "text-vl-dark-900 hover:bg-vl-white-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Tag className="text-vl-dark-900/40 size-3.5 shrink-0" />
                          <span>{cat.name}</span>
                        </div>
                        {isSelected && <Check className="text-vl-cyan size-4" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-muted-foreground p-4 text-center text-xs">
                No categories match &ldquo;<strong>{query}</strong>&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
