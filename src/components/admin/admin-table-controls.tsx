"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
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

import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
export { ADMIN_TABLE_CLASSES };
