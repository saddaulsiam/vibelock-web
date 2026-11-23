import * as React from "react";
import { cn } from "cn";

export interface ProductBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  variant?: "default" | "sale" | "new" | "featured" | "hot";
}

/**
 * Option A (Elevated): Streetwear Brutalist Box Badge with Distinct Semantic Colors
 * - SALE: Supreme-style high-impact red box
 * - NEW: VibeLock signature cyber cyan box
 * - HOT: Vibrant streetwear flame amber box
 * - FEATURED: Obsidian black with gold technical border
 */
export function ProductBadge({
  label,
  variant = "default",
  className,
  ...props
}: ProductBadgeProps) {
  // Normalize semantic variant if default or auto-detect from label
  const normalizedVariant = React.useMemo(() => {
    const lower = label.toLowerCase().trim();
    // Prioritize label semantics for specific badges
    if (lower === "hot" || lower.includes("hype") || lower.includes("trending")) return "hot";
    if (lower === "new" || lower.includes("new drop")) return "new";
    if (lower === "sale" || lower.startsWith("-") || lower.includes("% off")) return "sale";
    if (variant && variant !== "default") return variant;
    if (lower === "featured") return "featured";
    return "default";
  }, [variant, label]);

  // Distinct Semantic Color Themes on Brutalist Box Geometry
  const variantStyles: Record<string, string> = {
    // Supreme-style Red Box (Discounts & Markdowns)
    sale: "bg-status-sale text-white border-transparent shadow-xs font-black",
    // VibeLock Cyber Cyan (Fresh Drops & New Arrivals)
    new: "bg-vl-cyan text-vl-dark-900 border-transparent shadow-xs font-black",
    // Flame Amber (Hot & Trending)
    hot: "bg-amber-400 text-vl-dark-900 border-transparent shadow-xs font-black",
    // Obsidian Black with Gold Accent (Featured & Vault)
    featured: "border-amber-400/40 bg-vl-dark-900 text-amber-200 shadow-xs font-bold",
    // Default Obsidian Black
    default: "border-white/20 bg-vl-dark-900 text-white shadow-xs font-bold",
  };

  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-2xs border px-2 font-mono text-[10px] tracking-widest uppercase select-none shadow-2xs whitespace-nowrap",
        variantStyles[normalizedVariant] ?? variantStyles.default,
        className
      )}
      {...props}
    >
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}
