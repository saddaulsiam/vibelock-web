import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // ── Existing variants (preserved exactly) ─────────────────────────
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        /** Existing — Electric cyan accent (new feature labels, in-stock, shipping info) */
        cyan: "bg-vl-cyan/15 text-[#00a3c4] dark:text-vl-cyan border border-vl-cyan/30 font-bold uppercase tracking-wider text-2xs",
        /** Existing — Obsidian brand label */
        brand:
          "bg-vl-black text-vl-white border border-vl-border font-bold uppercase tracking-wider text-2xs",

        // ── New status variants (Phase 2C) ────────────────────────────────
        /**
         * sale — Storefront price / discount label.
         * Solid red-500: high-contrast attention signal for price reduction.
         * Pattern confirmed: raw <span> sales labels across product cards.
         * Uses rounded-xs (2px) to match storefront sharp-corner aesthetic.
         * Uppercase + tracking for readability at small size.
         */
        sale: "rounded-xs bg-red-500 text-white border-transparent font-black uppercase tracking-wider",

        /**
         * success — Order confirmed, payment verified, in-stock, completed status.
         * Pattern: emerald-100 bg / emerald-700 text / emerald-200 border.
         * Confirmed across: account/orders, admin/orders, checkout success states.
         */
        success: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",

        /**
         * warning — Pending payment, low stock, needs attention.
         * Pattern: amber-100 bg / amber-700 text / amber-200 border.
         * Confirmed across: admin order status, inventory low-stock indicators.
         */
        warning: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",

        /**
         * error — Failed payment, cancelled, out-of-stock, validation failure.
         * Pattern (light): red-50 bg / red-700 text / red-200 border.
         * Note: the dark-surface pattern (red-500/10 bg + red-400 text) is intentional
         * for auth pages only and is not represented here — those pages use inline classes
         * on a dark canvas and would not use a Badge component in that context.
         */
        error: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
