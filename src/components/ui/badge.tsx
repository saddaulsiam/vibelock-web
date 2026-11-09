import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "cn";

/**
 * World-Class E-Commerce Badge Variants
 * Engineered for elevated brutalist streetwear aesthetics (Nike, Kith, Supreme, Shopify Plus).
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap select-none transition-all outline-none font-heading text-xs font-bold tracking-wider uppercase border focus-visible:ring-2 focus-visible:ring-vl-cyan [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        // ── Core Base Variants (Preserved 1:1 for design system contracts) ──
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",

        // ── Canonical VibeLock Brand Variants ──────────────────────────────
        /** Electric cyber cyan accent (featured drops, verified authentic, primary live badge) */
        cyan: "bg-vl-cyan-100 text-vl-cyan-dark dark:text-vl-cyan border border-vl-cyan-200 font-bold uppercase tracking-wider",

        /** Obsidian brutalist brand label */
        brand:
          "bg-vl-black text-vl-white border-vl-border font-bold uppercase tracking-wider shadow-2xs",

        /** Neon cyber pulse glow — signature VibeLock drop aesthetics */
        glow: "bg-vl-cyan/15 text-vl-cyan border border-vl-cyan/40 shadow-[0_0_12px_rgba(0,217,255,0.25)]",

        /** Obsidian dark container tag with subtle border */
        dark: "bg-vl-dark-900 text-white border border-vl-dark-700 shadow-2xs",

        /** Frosted glassmorphism for floating over product photos/lookbooks */
        glass: "bg-black/55 backdrop-blur-md text-white border border-white/20 shadow-xs",

        // ── High-Impact E-Commerce Retail Badges ───────────────────────────
        /**
         * sale — High-contrast attention signal for price reduction.
         * Exact contract: "bg-status-sale text-white"
         */
        sale: "rounded-brand bg-status-sale text-white border-transparent font-black uppercase tracking-wider shadow-xs",

        /**
         * new — New collection drop / streetwear edition.
         * Exact contract: "bg-status-sale text-white"
         */
        new: "rounded-brand bg-status-sale text-white border-transparent font-black uppercase tracking-wider shadow-xs",

        /**
         * featured — Editor's pick / hyped drop.
         * Exact contract: "bg-amber-400 text-vl-black"
         */
        featured:
          "rounded-brand bg-amber-400 text-vl-black border-transparent font-black uppercase tracking-wider shadow-xs",

        /**
         * vip / gold — Vault collection, loyalty tier, or club drop.
         */
        vip: "bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold",

        /**
         * purple / drop — Collaboration, capsule edition, artist drop.
         */
        drop: "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 font-bold",

        // ── Operational & Order Status Badges ──────────────────────────────
        /**
         * success — Order delivered, payment verified, in-stock, completed.
         * Exact contract: "bg-emerald-100 text-emerald-800"
         */
        success:
          "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 font-semibold",

        /**
         * warning — Pending payment, low stock, QC review, action required.
         * Exact contract: "bg-amber-100 text-amber-800"
         */
        warning:
          "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 font-semibold",

        /**
         * error — Failed payment, cancelled, out-of-stock, return rejected.
         * Exact contract: "bg-rose-100 text-rose-800"
         */
        error:
          "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800 font-semibold",

        /**
         * info / logistics — Courier in-transit, dispatch update, info alert.
         */
        info: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 font-semibold",
      },

      size: {
        /** sm — 18px compact tag (table cells, inline stock indicators, small cards) */
        sm: "h-4.5 px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wider gap-1",
        /** default — 20px standard status pill (orders, cards, popovers) */
        default: "h-5 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider",
        /** lg — 24px prominent tag (hero banners, product pages, prominent order statuses) */
        lg: "h-6 px-2.5 py-1 text-xs font-bold uppercase tracking-wider gap-1.5",
        /** xl — 28px statement tag (product detail page headline drops, limited countdowns) */
        xl: "h-7 px-3 py-1 text-xs font-extrabold uppercase tracking-widest gap-2",
      },

      shape: {
        /** pill — Modern DTC / Apple / Shopify standard round pill */
        pill: "rounded-full",
        /** square — Brutalist streetwear rounded-brand box (Kith, Supreme, Nike SNKRS) */
        square: "rounded-brand",
        /** sharp — Brutalist high-fashion unrounded label (Off-White, Balenciaga) */
        sharp: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "pill",
    },
  }
);

/**
 * Status dot color mapper aligned with badge variants.
 */
function getDotColor(variant?: string | null) {
  switch (variant) {
    case "success":
      return { dot: "bg-emerald-500", ping: "bg-emerald-400" };
    case "warning":
      return { dot: "bg-amber-500", ping: "bg-amber-400" };
    case "error":
    case "destructive":
    case "sale":
    case "new":
      return { dot: "bg-rose-500", ping: "bg-rose-400" };
    case "cyan":
    case "glow":
      return { dot: "bg-vl-cyan", ping: "bg-vl-cyan" };
    case "brand":
    case "dark":
    case "glass":
      return { dot: "bg-white", ping: "bg-white/80" };
    case "vip":
      return { dot: "bg-amber-400", ping: "bg-amber-300" };
    case "drop":
      return { dot: "bg-purple-500", ping: "bg-purple-400" };
    case "info":
      return { dot: "bg-blue-500", ping: "bg-blue-400" };
    default:
      return { dot: "bg-current opacity-70", ping: "bg-current opacity-40" };
  }
}

export interface BadgeProps
  extends useRender.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  /**
   * Status dot indicator:
   * - `true`: Solid status dot
   * - `"pulse"`: Animated radar ping pulse (ideal for live order tracking, limited drops)
   */
  dot?: boolean | "pulse";
  /** Optional icon prefix */
  icon?: React.ReactNode;
  /** Whether the badge displays an interactive dismiss/remove button */
  removable?: boolean;
  /** Callback fired when the dismiss button is clicked */
  onRemove?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Accessible label for the remove button */
  removeLabel?: string;
}

function Badge({
  className,
  variant = "default",
  size = "default",
  shape = "pill",
  dot,
  icon,
  removable,
  onRemove,
  removeLabel = "Remove tag",
  render,
  children,
  ...props
}: BadgeProps) {
  const dotColors = dot ? getDotColor(variant) : null;

  const content = (
    <>
      {/* ── Status Dot with Optional Radar Pulse ── */}
      {dot && dotColors && (
        <span className="relative flex size-1.5 shrink-0 items-center justify-center">
          {dot === "pulse" && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                dotColors.ping
              )}
            />
          )}
          <span className={cn("relative inline-flex size-1.5 rounded-full", dotColors.dot)} />
        </span>
      )}

      {/* ── Optional Icon Prefix ── */}
      {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}

      {/* ── Badge Content ── */}
      <span>{children}</span>

      {/* ── Optional Dismiss / Remove Action (For Filter Chips & Tags) ── */}
      {(removable || onRemove) && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="-mr-1 inline-flex size-3.5 cursor-pointer items-center justify-center rounded-full opacity-70 transition-opacity hover:bg-black/10 hover:opacity-100 focus-visible:outline-none"
        >
          <X className="size-2.5" />
        </button>
      )}
    </>
  );

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size, shape }), className),
      },
      props,
      {
        children: dot || icon || removable || onRemove ? content : children,
      }
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
      shape,
    },
  });
}

export { Badge, badgeVariants };
