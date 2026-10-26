import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminKpiTone = "neutral" | "emerald" | "amber" | "rose" | "blue" | "purple" | "cyan";

export interface AdminKpiCardProps {
  /** Top label describing the metric */
  label: string;
  /** Primary metric display value (e.g. "1,240", "৳45,200", "0") */
  value: React.ReactNode;
  /** Secondary micro-copy or context */
  description?: React.ReactNode;
  /** Lucide icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Accent color tone */
  tone?: AdminKpiTone;
  /** If true or conditional, emphasizes the card with a warning/alert background */
  alert?: boolean;
  /** Optional link to jump directly to a filtered view */
  href?: string;
  /** Optional extra classes */
  className?: string;
}

const TONE_STYLES: Record<
  AdminKpiTone,
  {
    label: string;
    iconBg: string;
    iconColor: string;
    value: string;
    alertBorder: string;
    alertBg: string;
  }
> = {
  neutral: {
    label: "text-neutral-500",
    iconBg: "bg-neutral-100",
    iconColor: "text-neutral-700",
    value: "text-[#101114]",
    alertBorder: "border-neutral-300",
    alertBg: "bg-neutral-50/50",
  },
  emerald: {
    label: "text-emerald-700",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    value: "text-emerald-800",
    alertBorder: "border-emerald-300",
    alertBg: "bg-emerald-50/40",
  },
  amber: {
    label: "text-amber-700",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    value: "text-amber-800",
    alertBorder: "border-amber-300",
    alertBg: "bg-amber-50/40",
  },
  rose: {
    label: "text-rose-700",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    value: "text-rose-800",
    alertBorder: "border-rose-300",
    alertBg: "bg-rose-50/40",
  },
  blue: {
    label: "text-blue-700",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    value: "text-[#101114]",
    alertBorder: "border-blue-300",
    alertBg: "bg-blue-50/40",
  },
  purple: {
    label: "text-purple-700",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    value: "text-[#101114]",
    alertBorder: "border-purple-300",
    alertBg: "bg-purple-50/40",
  },
  cyan: {
    label: "text-cyan-700",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    value: "text-[#101114]",
    alertBorder: "border-cyan-300",
    alertBg: "bg-cyan-50/40",
  },
};

export function AdminKpiCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  alert = false,
  href,
  className,
}: AdminKpiCardProps) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.neutral;

  const content = (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 shadow-2xs transition-all duration-200",
        alert
          ? cn(styles.alertBorder, styles.alertBg, "shadow-xs")
          : "border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-xs",
        href && "group cursor-pointer hover:-translate-y-0.5",
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[11px] font-bold tracking-wider uppercase",
              alert ? styles.label : "text-neutral-500"
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
              styles.iconBg,
              styles.iconColor,
              alert && tone === "rose" && "animate-pulse"
            )}
          >
            <Icon className="size-4" />
          </span>
        </div>

        <div
          className={cn(
            "mt-2.5 text-2xl font-black tracking-tight",
            alert ? styles.value : "text-[#101114]"
          )}
        >
          {value}
        </div>
      </div>

      {description && (
        <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#101114]">
        {content}
      </Link>
    );
  }

  return content;
}

export interface AdminKpiGridProps {
  columns?: 2 | 3 | 4 | 5;
  children: React.ReactNode;
  className?: string;
}

export function AdminKpiGrid({ columns = 4, children, className }: AdminKpiGridProps) {
  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-5",
  }[columns];

  return (
    <div className={cn("grid gap-3.5", colClass, className)}>
      {children}
    </div>
  );
}
