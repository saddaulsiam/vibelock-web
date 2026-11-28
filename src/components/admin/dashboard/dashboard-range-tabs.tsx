"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const DASHBOARD_RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "this-month", label: "Current month" },
] as const;

export type DashboardRangePresetKey = (typeof DASHBOARD_RANGE_PRESETS)[number]["key"];

interface DashboardRangeTabsProps {
  currentRange: string;
  className?: string;
}

export function DashboardRangeTabs({ currentRange, className }: DashboardRangeTabsProps) {
  return (
    <Tabs value={currentRange} className={className}>
      <TabsList
        aria-label="Executive KPI range presets"
        className={cn("h-auto flex-wrap", className)}
      >
        {DASHBOARD_RANGE_PRESETS.map((preset) => {
          const href = preset.key === "30d" ? "/admin" : `/admin?range=${preset.key}`;
          return (
            <TabsTrigger
              key={preset.key}
              value={preset.key}
              render={<Link href={href} />}
              nativeButton={false}
              className="px-3.5"
            >
              {preset.key === "today" && currentRange === "today" && (
                <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500" />
              )}
              {preset.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
