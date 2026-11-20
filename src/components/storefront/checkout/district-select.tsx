"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "cn";

/**
 * 64 Districts of Bangladesh grouped by 8 Divisions (A-Z within each division).
 * Canonical division mapping per Bangladesh administrative geography.
 */
export const BD_DIVISIONS: Record<string, readonly string[]> = {
  "Dhaka Division": [
    "Dhaka",
    "Faridpur",
    "Gazipur",
    "Gopalganj",
    "Kishoreganj",
    "Madaripur",
    "Manikganj",
    "Munshiganj",
    "Narayanganj",
    "Narsingdi",
    "Rajbari",
    "Shariatpur",
    "Tangail",
  ],
  "Chattogram Division": [
    "Bandarban",
    "Brahmanbaria",
    "Chandpur",
    "Chattogram",
    "Cox's Bazar",
    "Cumilla",
    "Feni",
    "Khagrachhari",
    "Lakshmipur",
    "Noakhali",
    "Rangamati",
  ],
  "Rajshahi Division": [
    "Bogura",
    "Chapai Nawabganj",
    "Joypurhat",
    "Naogaon",
    "Natore",
    "Pabna",
    "Rajshahi",
    "Sirajganj",
  ],
  "Khulna Division": [
    "Bagerhat",
    "Chuadanga",
    "Jashore",
    "Jhenaidah",
    "Khulna",
    "Kushtia",
    "Magura",
    "Meherpur",
    "Narail",
    "Satkhira",
  ],
  "Barishal Division": ["Barguna", "Barishal", "Bhola", "Jhalokathi", "Patuakhali", "Pirojpur"],
  "Sylhet Division": ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  "Rangpur Division": [
    "Dinajpur",
    "Gaibandha",
    "Kurigram",
    "Lalmonirhat",
    "Nilphamari",
    "Panchagarh",
    "Rangpur",
    "Thakurgaon",
  ],
  "Mymensingh Division": ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
} as const;

export const BD_DISTRICTS: readonly string[] = Object.values(BD_DIVISIONS).flat();

export interface DistrictSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (district: string) => void;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DistrictSelect({
  id = "shippingCity",
  name = "shippingCity",
  value,
  onChange,
  error = false,
  disabled = false,
  placeholder = "Select your district",
  className,
}: DistrictSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [openUpwards, setOpenUpwards] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key and return focus to trigger
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearchQuery("");
        triggerRef.current?.focus();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Flip upward if near bottom of viewport
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

  // Focus search input on open
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter divisions and districts based on search query
  const filteredGroups = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return BD_DIVISIONS;

    const result: Record<string, string[]> = {};
    for (const [division, districts] of Object.entries(BD_DIVISIONS)) {
      const isDivisionMatch = division.toLowerCase().includes(q);
      const matched = districts.filter((d) => isDivisionMatch || d.toLowerCase().includes(q));
      if (matched.length > 0) {
        result[division] = matched;
      }
    }
    return result;
  }, [searchQuery]);

  // Flattened list of currently visible matching districts
  const flattenedDistricts = React.useMemo(() => {
    return Object.values(filteredGroups).flat();
  }, [filteredGroups]);

  const totalMatches = flattenedDistricts.length;

  // Pre-calculate index map for each visible district
  const districtIndexMap = React.useMemo(() => {
    const map = new Map<string, number>();
    flattenedDistricts.forEach((d, idx) => {
      map.set(d, idx);
    });
    return map;
  }, [flattenedDistricts]);

  // Auto-scroll list container to keep highlighted item in view
  React.useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const highlightedEl = listRef.current.querySelector<HTMLElement>(
        `[data-district-index="${highlightedIndex}"]`
      );
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const openDropdown = () => {
    const selectedIdx = flattenedDistricts.indexOf(value);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleSelect = (district: string) => {
    onChange(district);
    closeDropdown();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(0);
  };

  // Keyboard navigation inside search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (totalMatches === 0) return;
      setHighlightedIndex((prev) => (prev < totalMatches - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalMatches === 0) return;
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalMatches - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < totalMatches) {
        handleSelect(flattenedDistricts[highlightedIndex]);
      } else if (totalMatches > 0) {
        handleSelect(flattenedDistricts[0]);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      if (totalMatches > 0) setHighlightedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      if (totalMatches > 0) setHighlightedIndex(totalMatches - 1);
    } else if (e.key === "Tab") {
      closeDropdown();
    }
  };

  // Keyboard navigation on trigger button (Arrow keys / Enter / Space opens dropdown)
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
      }
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Hidden native select for SSR compatibility, screen readers, and automated testing */}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {Object.entries(BD_DIVISIONS).map(([division, districts]) => (
          <optgroup key={division} label={division}>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-invalid={error}
        disabled={disabled}
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "rounded-brand flex h-11 w-full items-center justify-between border bg-white px-3.5 text-left text-sm transition-colors outline-none select-none",
          "border-vl-black/15 text-vl-black hover:border-vl-black/40",
          "focus-visible:border-vl-cyan focus-visible:ring-vl-cyan focus-visible:ring",
          error &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          disabled && "cursor-not-allowed bg-neutral-100 opacity-50",
          className
        )}
      >
        <span className={cn("truncate font-medium", !value && "text-vl-dark-900/30")}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "text-vl-dark-400 size-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "border-vl-dark-200 absolute left-0 z-50 w-full overflow-hidden rounded-md border bg-white shadow-xl",
            openUpwards ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          {/* Search Box */}
          <div className="border-vl-dark-100 bg-vl-white-100 sticky top-0 z-10 border-b p-2">
            <div className="relative flex items-center">
              <Search className="text-vl-dark-400 pointer-events-none absolute left-2.5 size-3.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search district..."
                aria-label="Search district"
                className="placeholder:text-vl-dark-900/40 text-vl-black focus:border-vl-cyan focus:ring-vl-cyan/20 w-full rounded-sm border border-neutral-200 bg-white py-1.5 pr-7 pl-8 text-xs outline-none focus:ring-1"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setHighlightedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  className="text-vl-dark-400 hover:text-vl-black absolute right-2 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Options List */}
          <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
            {totalMatches === 0 ? (
              <div className="text-vl-dark-400 py-6 text-center text-xs">
                No district found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              Object.entries(filteredGroups).map(([division, districts]) => (
                <div key={division} className="py-1">
                  {/* Division Header */}
                  <div className="text-vl-black px-3 py-1 text-xs font-bold tracking-tight select-none">
                    {division}
                  </div>
                  {/* District Items */}
                  <div className="space-y-0.5">
                    {districts.map((district) => {
                      const itemIdx = districtIndexMap.get(district) ?? 0;
                      const isSelected = value === district;
                      const isHighlighted = highlightedIndex === itemIdx;

                      return (
                        <button
                          key={district}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-district-index={itemIdx}
                          onMouseEnter={() => setHighlightedIndex(itemIdx)}
                          onClick={() => handleSelect(district)}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between py-1.5 pr-3 pl-6 text-left text-xs transition-colors",
                            isSelected || isHighlighted
                              ? "bg-[#1a73e8] font-medium text-white"
                              : "text-vl-dark-900 hover:bg-[#1a73e8] hover:text-white"
                          )}
                        >
                          <span>{district}</span>
                          {isSelected && <Check className="size-3.5 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
