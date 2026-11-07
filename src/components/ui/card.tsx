import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const cardVariants = cva(
  // Base — identical to original flat class string; all existing consumers
  // using no variant prop will receive the exact same computed classes.
  "group/card bg-card text-card-foreground ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm ring-1 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  {
    variants: {
      variant: {
        /**
         * default — original card appearance unchanged.
         * bg-card surface, ring-1 border, rounded-xl. Admin data cards,
         * generic content containers.
         */
        default: "",

        /**
         * brand — Storefront / account white card with vl-black tinted border.
         * Pattern confirmed: account pages (rounded-2xl, border-[#101114]/8,
         * bg-white, shadow-2xs). Overrides base ring with explicit border + shadow.
         * Uses --color-vl-black for border opacity utility.
         */
        brand:
          "bg-white ring-0 border border-vl-black/8 rounded-2xl shadow-2xs",

        /**
         * dark — Auth pages and POS dark-surface card.
         * Pattern confirmed: auth forms use bg-[#16171b] (surface-dark token),
         * border-[#303137] (border-dark token), rounded-lg, no shadow.
         * Overrides bg-card and ring with explicit dark surface tokens.
         */
        dark: "bg-surface-dark text-vl-white ring-0 border border-border-dark rounded-lg",

        /**
         * panel — Checkout, order summary, FAQ warm-off-white panel.
         * Pattern confirmed: #FAF9F5 bg (surface-warm-soft token) with
         * #101114/8 border across checkout-form and order-summary loading states.
         * Rounded-xl preserved (same as default base). Removes default ring.
         */
        panel:
          "bg-surface-warm-soft ring-0 border border-vl-black/8 rounded-xl",
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
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
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
