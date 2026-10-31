"use client";

import * as React from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminTableTabItem<T extends string = string> {
  key: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
  dotColor?: string; // e.g. "bg-emerald-500", "bg-amber-500", "bg-rose-500"
}

export interface AdminTableTabsProps<T extends string = string> {
  tabs: AdminTableTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}

export function AdminTableTabs<T extends string = string>({
  tabs,
  activeKey,
  onChange,
  className,
}: AdminTableTabsProps<T>) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 text-xs", className)}>
      {tabs.map((tab) => {
        const isActive = activeKey === tab.key;
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]",
              isActive
                ? "bg-[#101114] text-white shadow-2xs font-semibold"
                : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 font-medium"
            )}
          >
            {Icon && <Icon className="size-3.5 shrink-0" />}
            {tab.dotColor && !Icon && (
              <span className={cn("size-1.5 rounded-full shrink-0", tab.dotColor)} />
            )}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span className={cn("text-[11px]", isActive ? "text-white/80" : "text-neutral-500")}>
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface AdminTableSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
}

export function AdminTableSearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  inputRef,
  className,
}: AdminTableSearchInputProps) {
  return (
    <div className={cn("relative flex-1 max-w-lg", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-neutral-200 bg-white pr-10 pl-9 text-xs text-[#101114] placeholder:text-neutral-400 outline-none transition-colors hover:border-neutral-300 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-900 transition-colors"
          title="Clear search"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <kbd
          className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 items-center rounded border border-neutral-200 bg-[#F3F0E8] px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 sm:inline-flex"
          title="Press / to search"
        >
          /
        </kbd>
      )}
    </div>
  );
}

export interface AdminTableMetaBarProps {
  currentCount: number;
  totalFiltered: number;
  totalCount?: number;
  itemName?: string;
  pluralItemName?: string;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  className?: string;
  actionSlot?: React.ReactNode;
}

/**
 * Reusable table counter and active filter reset bar for all Admin tables.
 */
export function AdminTableMetaBar({
  currentCount,
  totalFiltered,
  totalCount,
  itemName = "item",
  pluralItemName,
  hasActiveFilters = false,
  onResetFilters,
  className,
  actionSlot,
}: AdminTableMetaBarProps) {
  const displayPlural = pluralItemName ?? `${itemName}s`;
  const nameLabel = totalFiltered === 1 ? itemName : displayPlural;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <p>
          Showing <span className="font-semibold text-neutral-900">{currentCount}</span> of{" "}
          <span className="font-semibold text-neutral-900">{totalFiltered}</span>{" "}
          {nameLabel}
          {typeof totalCount === "number" &&
            totalFiltered !== totalCount &&
            ` (filtered from ${totalCount})`}
        </p>
        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <RotateCcw className="size-3" />
            Reset filters
          </button>
        )}
      </div>
      {actionSlot && <div>{actionSlot}</div>}
    </div>
  );
}

export interface AdminTableFilterSelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface AdminTableFilterSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly AdminTableFilterSelectOption<T>[] | AdminTableFilterSelectOption<T>[];
  icon?: React.ComponentType<{ className?: string }>;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Standard accessible dropdown filter select for Admin tables.
 */
export function AdminTableFilterSelect<T extends string = string>({
  value,
  onChange,
  options,
  icon: Icon,
  ariaLabel,
  className,
  disabled = false,
}: AdminTableFilterSelectProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 shadow-2xs transition-colors hover:border-neutral-300 focus-within:ring-2 focus-within:ring-[#00D9FF]",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0 text-neutral-500" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={ariaLabel}
        disabled={disabled}
        className="bg-transparent text-xs font-medium text-neutral-800 outline-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
export { ADMIN_TABLE_CLASSES };
export { useAdminTableUrlFilters, buildFilterUrl } from "./admin-table-filters";
export type { UseAdminTableUrlFiltersOptions, BuildFilterUrlOptions } from "./admin-table-filters";
