import * as React from "react";
import { cn } from "@/lib/utils";

export interface AdminPageHeaderProps {
  /** Optional top eyebrow category, e.g. "Operations / Sales", "Catalog / Products" */
  eyebrow?: string;
  /** Page primary heading text */
  title: string;
  /** Live engine/status pill text, e.g. "Live Ledger", "Catalog Engine", "Live Dispatch" */
  badgeLabel?: string;
  /** Pill tone variant */
  badgeVariant?: "emerald" | "cyan" | "purple" | "blue" | "amber";
  /** Subtitle / descriptive summary */
  description?: string;
  /** Action buttons / navigation elements rendered on right side of header */
  children?: React.ReactNode;
  /** Optional custom class */
  className?: string;
}

const BADGE_STYLES = {
  emerald: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-600",
  },
  cyan: {
    container: "border-cyan-200 bg-cyan-50 text-cyan-800",
    dot: "bg-cyan-600",
  },
  purple: {
    container: "border-purple-200 bg-purple-50 text-purple-800",
    dot: "bg-purple-600",
  },
  blue: {
    container: "border-blue-200 bg-blue-50 text-blue-800",
    dot: "bg-blue-600",
  },
  amber: {
    container: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-600",
  },
};

export function AdminPageHeader({
  eyebrow,
  title,
  badgeLabel,
  badgeVariant = "emerald",
  description,
  children,
  className,
}: AdminPageHeaderProps) {
  const badgeStyle = BADGE_STYLES[badgeVariant] ?? BADGE_STYLES.emerald;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] uppercase text-neutral-500">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-[#101114] sm:text-3xl">
            {title}
          </h1>
          {badgeLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase shadow-2xs",
                badgeStyle.container
              )}
            >
              <span className={cn("size-1.5 rounded-full animate-pulse", badgeStyle.dot)} />
              {badgeLabel}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 sm:text-sm">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
