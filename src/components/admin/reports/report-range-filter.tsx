"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Check, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

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
        {/* Animated Segmented Tabs via design-system Tabs */}
        <Tabs value={currentRange}>
          <TabsList aria-label="Report date range presets" className="h-auto flex-wrap">
            {REPORT_RANGE_PRESETS.map((preset) => (
              <TabsTrigger
                key={preset.key}
                value={preset.key}
                render={<Link href={buildPresetHref(preset.key)} />}
                nativeButton={false}
              >
                {preset.key === "custom" && <SlidersHorizontal className="size-3" />}
                <span>{preset.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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
              className="h-9 w-40 font-mono text-xs"
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
              className="h-9 w-40 font-mono text-xs"
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
