"use client";

import * as React from "react";
import { Columns3, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnOption<T extends string = string> {
  key: T;
  label: string;
}

export interface AdminTableColumnVisibilityProps<T extends string = string> {
  columns: ColumnOption<T>[];
  visibleColumns: Record<T, boolean>;
  onChange: (key: T, value: boolean) => void;
  onReset?: () => void;
  className?: string;
  buttonClassName?: string;
}

export function AdminTableColumnVisibility<T extends string = string>({
  columns,
  visibleColumns,
  onChange,
  onReset,
  className,
  buttonClassName,
}: AdminTableColumnVisibilityProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Close when clicking outside or pressing Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const hiddenCount = columns.filter((c) => !visibleColumns[c.key]).length;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none",
          buttonClassName
        )}
        title="Customize visible columns"
        aria-expanded={isOpen}
      >
        <Columns3 className="size-3.5 text-zinc-500" />
        <span>Columns</span>
        {hiddenCount > 0 && (
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">
            {columns.length - hiddenCount}/{columns.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="animate-in fade-in zoom-in-95 absolute top-full right-0 z-40 mt-1.5 w-56 rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-xl duration-150">
          <div className="mb-2 flex items-center justify-between border-b border-zinc-100 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
              Customize Columns
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 transition"
              aria-label="Close column customizer"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="space-y-0.5 text-xs">
            {columns.map((col) => {
              const isChecked = visibleColumns[col.key];
              return (
                <label
                  key={col.key}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors hover:bg-zinc-50"
                >
                  <span className="text-zinc-800 select-none">{col.label}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onChange(col.key, e.target.checked)}
                    className="size-3.5 cursor-pointer rounded-xs accent-[#101114]"
                  />
                </label>
              );
            })}
          </div>

          {onReset && hiddenCount > 0 && (
            <div className="mt-2 border-t border-zinc-100 pt-2">
              <button
                type="button"
                onClick={onReset}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition"
              >
                <RotateCcw className="size-3" />
                <span>Reset to default</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
