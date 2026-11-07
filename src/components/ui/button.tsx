import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        /** Existing — Auth pages electric cyan CTA */
        cyan: "bg-vl-cyan text-vl-black font-bold hover:bg-[#2ae0ff] shadow-[0_0_18px_rgba(0,217,255,0.3)] hover:shadow-[0_0_28px_rgba(0,217,255,0.5)] focus-visible:ring-vl-cyan active:scale-95",
        /** Existing — General dark brand surface button */
        brand:
          "bg-vl-black text-vl-white border border-vl-border hover:bg-black/90 hover:border-vl-cyan focus-visible:ring-vl-cyan",
        /**
         * streetwear — Primary storefront CTA.
         * Matches the dominant hardcoded pattern across error.tsx, not-found.tsx
         * and all major shop/product CTAs: rounded-xs, font-black, tracking-widest,
         * uppercase, min-h-11. Uses vl-black surface.
         * Overrides base rounded-lg via rounded-xs.
         */
        streetwear:
          "rounded-xs bg-vl-black text-vl-white font-black tracking-widest uppercase min-h-11 hover:bg-black/85 focus-visible:ring-vl-cyan",
        /**
         * streetwear-outline — Secondary / ghost storefront CTA.
         * Inverse of streetwear: transparent with vl-black border.
         * Hover fills to vl-black. Used for wishlist, secondary shop actions.
         */
        "streetwear-outline":
          "rounded-xs border border-vl-black bg-transparent text-vl-black font-black tracking-widest uppercase min-h-11 hover:bg-vl-black hover:text-vl-white focus-visible:ring-vl-cyan",
        /**
         * destructive-inline — Compact delete / danger action in data-tables.
         * Smaller than default destructive; solid red for high-contrast danger signal.
         * Does not use the default destructive pattern (tinted bg) intentionally.
         */
        "destructive-inline":
          "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500 font-medium",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        /** xl — 44px touch target. Standard mobile-safe interactive size. */
        xl: "h-11 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        /** 2xl — 48px. Hero-section and large CTA emphasis. */
        "2xl": "h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const isCustomRenderNonButton =
    nativeButton === undefined &&
    React.isValidElement(props.render) &&
    props.render.type !== "button";

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      nativeButton={isCustomRenderNonButton ? false : nativeButton}
      {...props}
    />
  );
}

export { Button, buttonVariants };
