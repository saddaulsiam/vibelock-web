import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
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
        /** Electric cyan accent (verified buyer, featured drops, in-stock) */
        cyan: "bg-vl-cyan-100 text-vl-cyan-dark dark:text-vl-cyan border border-vl-cyan-200 font-bold uppercase tracking-wider",
        /** Obsidian brand label */
        brand:
          "bg-vl-black text-vl-white border border-vl-border font-bold uppercase tracking-wider",

        // ── Streetwear & Status variants ────────────────────────────────
        /**
         * sale — Storefront price / discount label.
         * Solid red-500 (#E50010): high-contrast attention signal for price reduction.
         * Uses rounded-xs (2px) to match storefront sharp-corner aesthetic.
         */
        sale: "rounded-brand bg-status-sale text-white border-transparent font-black uppercase tracking-wider shadow-xs",

        /**
         * new — New collection / streetwear drop badge.
         */
        new: "rounded-brand bg-status-sale text-white border-transparent font-black uppercase tracking-wider shadow-xs",

        /**
         * featured — Highlighted product / editor's pick badge.
         */
        featured: "rounded-brand bg-amber-400 text-vl-black border-transparent font-black uppercase tracking-wider shadow-xs",

        /**
         * success — Order confirmed, payment verified, in-stock, completed status.
         */
        success: "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",

        /**
         * warning — Pending payment, low stock, needs attention.
         */
        warning: "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",

        /**
         * error — Failed payment, cancelled, out-of-stock, validation failure.
         */
        error: "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
      },
      size: {
        /** sm — 18px compact tag */
        sm: "h-4.5 px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wider",
        /** default — 20px standard status pill */
        default: "h-5 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider",
        /** lg — 24px prominent tag */
        lg: "h-6 px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  });
}

export { Badge, badgeVariants };
