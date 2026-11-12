import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const cardVariants = cva(
  "group/card flex flex-col text-card-foreground overflow-hidden text-sm transition-all",
  {
    variants: {
      variant: {
        /**
         * default — standard admin and operational surface, governed by master card radius.
         */
        default: "bg-card border border-border rounded-card ring-1 ring-foreground/10",

        /**
         * brand — Storefront & Account clean white card with subtle obsidian border.
         * Governed by master card radius (--radius-card) with soft 2xs elevation.
         */
        brand: "bg-white border border-vl-black/8 rounded-card shadow-2xs",

        /**
         * dark — Auth pages and POS dark-surface card.
         */
        dark: "bg-surface-dark text-vl-white border border-border-dark rounded-card",

        /**
         * panel — Checkout, order summary, FAQ warm-off-white panel.
         */
        panel: "bg-surface-warm-soft border border-vl-black/8 rounded-card",

        /**
         * interactive — Storefront hoverable cards (coupons, action tiles).
         */
        interactive:
          "bg-white border border-vl-black/10 rounded-card shadow-2xs hover:border-vl-black/30 hover:shadow-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Card({
  className,
  variant,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-(--card-spacing)", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "bg-muted/50 flex items-center rounded-b-xl border-t p-(--card-spacing)",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
