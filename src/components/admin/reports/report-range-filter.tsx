"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Check, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const REPORT_RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "custom", label: "Custom" },
] as const;

export type ReportRangeKey = (typeof REPORT_RANGE_PRESETS)[number]["key"];

interface ReportRangeFilterProps {
  currentRange: string;
  from?: string;
  to?: string;
  startDate: Date;
  endDate: Date;
  searchParamsRecord: Record<string, string | undefined>;
}

export function ReportRangeFilter({
  currentRange,
  from,
  to,
  startDate,
  endDate,
  searchParamsRecord,
}: ReportRangeFilterProps) {
  const [hoveredPreset, setHoveredPreset] = React.useState<string | null>(null);
  const isCustom = currentRange === "custom";

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(date);

  const buildPresetHref = (key: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParamsRecord)) {
      if (
        v !== undefined &&
        v !== "" &&
        k !== "range" &&
        k !== "from" &&
        k !== "to" &&
        k !== "page" &&
        k !== "pPage"
      ) {
        params.set(k, v);
      }
    }
    if (key !== "30d") {
      params.set("range", key);
    }
    const query = params.toString();
    return query ? `?${query}` : "/admin/reports";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
        {/* Animated Segmented Tabs */}
        <nav
          aria-label="Report date range presets"
          className="relative inline-flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200/90 bg-neutral-100/80 p-1 shadow-2xs backdrop-blur-xs"
          onMouseLeave={() => setHoveredPreset(null)}
        >
          {REPORT_RANGE_PRESETS.map((preset) => {
            const isActive = currentRange === preset.key;
            const isHovered = hoveredPreset === preset.key;
            const href = buildPresetHref(preset.key);

            return (
              <Link
                key={preset.key}
                href={href}
                aria-current={isActive ? "page" : undefined}
                onMouseEnter={() => setHoveredPreset(preset.key)}
                className={cn(
                  "relative z-10 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors duration-150 select-none",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-vl-dark-900/20",
                  isActive ? "text-vl-dark-900 font-bold" : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                {/* Sliding Active Pill with Framer Motion spring */}
                {isActive && (
                  <motion.div
                    layoutId="reportActiveRangePill"
                    className="absolute inset-0 -z-10 rounded-lg border border-neutral-200/70 bg-white shadow-xs"
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 35,
                    }}
                  />
                )}

                {/* Subtle Hover Pill */}
                {!isActive && isHovered && (
                  <motion.div
                    layoutId="reportHoverRangePill"
                    className="absolute inset-0 -z-10 rounded-lg bg-white/60"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 40,
                    }}
                  />
                )}

                <span className="relative z-10 flex items-center gap-1.5">
                  {preset.key === "custom" && <SlidersHorizontal className="size-3" />}
                  {preset.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Resolved Window Stamp */}
        <div className="flex items-center gap-2 font-mono text-xs text-neutral-500">
          <Calendar className="size-3.5 text-neutral-400" />
          <span>
            {formatDate(startDate)} – {formatDate(new Date(endDate.getTime() - 1))}
          </span>
        </div>
      </div>

      {/* Custom Date Range Selector (Expandable when custom is selected) */}
      {isCustom && (
        <form
          action="/admin/reports"
          method="GET"
          className="flex flex-wrap items-end gap-3 rounded-sm border border-neutral-200 bg-white p-3.5 shadow-2xs"
        >
          <input type="hidden" name="range" value="custom" />
          {Object.entries(searchParamsRecord).map(([k, v]) => {
            if (v && k !== "range" && k !== "from" && k !== "to" && k !== "page" && k !== "pPage") {
              return <input key={k} type="hidden" name={k} value={v} />;
            }
            return null;
          })}

          <div className="space-y-1">
            <label
              htmlFor="custom-from-input"
              className="text-muted-foreground block text-[11px] font-semibold uppercase"
            >
              Start Date
            </label>
            <Input
              id="custom-from-input"
              name="from"
              type="date"
              defaultValue={from || ""}
              className="h-9 w-40 text-xs font-mono"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="custom-to-input"
              className="text-muted-foreground block text-[11px] font-semibold uppercase"
            >
              End Date
            </label>
            <Input
              id="custom-to-input"
              name="to"
              type="date"
              defaultValue={to || ""}
              className="h-9 w-40 text-xs font-mono"
              required
            />
          </div>

          <Button
            type="submit"
            className="bg-vl-dark-900 hover:bg-vl-dark-800 h-9 gap-1.5 px-4 text-xs font-semibold text-white shadow-2xs"
          >
            <Check className="size-3.5" />
            <span>Apply Custom Window</span>
          </Button>
        </form>
      )}
    </div>
  );
}
