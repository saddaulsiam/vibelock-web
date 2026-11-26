"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const [hoveredTab, setHoveredTab] = React.useState<string | null>(null);

  return (
    <nav
      aria-label="Executive KPI range presets"
      className={cn(
        "relative inline-flex flex-wrap items-center gap-1 rounded-md border border-neutral-200/90 bg-neutral-100/80 p-1 shadow-2xs backdrop-blur-xs",
        className
      )}
      onMouseLeave={() => setHoveredTab(null)}
    >
      {DASHBOARD_RANGE_PRESETS.map((preset) => {
        const isActive = currentRange === preset.key;
        const isHovered = hoveredTab === preset.key;
        const href = preset.key === "30d" ? "/admin" : `/admin?range=${preset.key}`;

        return (
          <Link
            key={preset.key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            onMouseEnter={() => setHoveredTab(preset.key)}
            className={cn(
              "relative z-10 rounded px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-colors duration-150 select-none",
              "focus-visible:ring-vl-dark-900/20 focus-visible:ring-2 focus-visible:outline-hidden",
              isActive ? "text-vl-dark-900" : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            {/* Smooth Sliding Active Pill with Spring Physics */}
            {isActive && (
              <motion.div
                layoutId="dashboardActiveRangePill"
                className="absolute inset-0 -z-10 rounded border border-neutral-200/70 bg-white shadow-xs"
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 35,
                }}
              />
            )}

            {/* Subtle Hover Indicator for inactive tabs */}
            {!isActive && isHovered && (
              <motion.div
                layoutId="dashboardHoverRangePill"
                className="absolute inset-0 -z-10 rounded bg-white/60"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 40,
                }}
              />
            )}

            <span className="relative z-10 flex items-center gap-1.5">
              {preset.key === "today" && isActive && (
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              )}
              {preset.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
