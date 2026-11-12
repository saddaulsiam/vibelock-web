"use client";

import * as React from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
          <Button
            key={tab.key}
            type="button"
            variant={isActive ? "primary" : "outline"}
            size="sm"
            onClick={() => onChange(tab.key)}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs font-semibold tracking-normal normal-case",
              isActive
                ? "bg-vl-dark-900 text-white shadow-2xs"
                : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
            )}
          >
            {Icon && <Icon className="size-3.5 shrink-0" />}
            {tab.dotColor && !Icon && (
              <span className={cn("size-1.5 shrink-0 rounded-full", tab.dotColor)} />
            )}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span className={cn("text-[11px]", isActive ? "text-white/80" : "text-neutral-500")}>
                ({tab.count})
              </span>
            )}
          </Button>
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
    <div className={cn("relative max-w-lg flex-1", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        suppressHydrationWarning
        size="default"
        className="pr-10 pl-9"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClear}
          className="absolute top-1/2 right-2.5 z-10 size-6 -translate-y-1/2 p-0 text-neutral-400 hover:text-neutral-900"
          title="Clear search"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </Button>
      ) : (
        <kbd
          className="bg-vl-white-300 pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 items-center rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 sm:inline-flex"
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
          <span className="font-semibold text-neutral-900">{totalFiltered}</span> {nameLabel}
          {typeof totalCount === "number" &&
            totalFiltered !== totalCount &&
            ` (filtered from ${totalCount})`}
        </p>
        {hasActiveFilters && onResetFilters && (
          <Button
            type="button"
            variant="link"
            size="xs"
            onClick={onResetFilters}
            className="h-auto gap-1 p-0 font-medium text-red-600 hover:text-red-700"
          >
            <RotateCcw className="size-3" />
            Reset filters
          </Button>
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
        "focus-within:ring-vl-cyan inline-flex h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 shadow-2xs transition-colors focus-within:ring-2 hover:border-neutral-300",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0 text-neutral-500" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={ariaLabel}
        disabled={disabled}
        className="cursor-pointer bg-transparent text-xs font-medium text-neutral-800 outline-none"
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

import { ADMIN_TABLE_CLASSES } from "@/lib/admin/shared";
export { ADMIN_TABLE_CLASSES };
export { useAdminTableUrlFilters, buildFilterUrl } from "./admin-table-filters";
export type { UseAdminTableUrlFiltersOptions, BuildFilterUrlOptions } from "./admin-table-filters";
