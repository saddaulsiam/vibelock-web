import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "cn";

const buttonVariants = cva(
  "group/button cursor-pointer inline-flex shrink-0 items-center justify-center rounded-brand border border-transparent bg-clip-padding font-heading text-sm font-bold tracking-wider uppercase whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /**
         * primary — Obsidian background, white text, cyan focus ring, streetwear hover glow.
         * Main actions and primary calls to action across VibeLock.
         */
        primary:
          "bg-vl-black text-vl-white hover:bg-black/90 active:scale-[0.98] focus-visible:ring-vl-cyan",
        /**
         * brand — Electric Cyber Cyan background, obsidian black text, cyan glow on hover.
         * High-energy brand calls to action, promotional highlights, and cyber accents.
         */
        brand:
          "bg-vl-cyan text-vl-dark-900 hover:bg-vl-cyan-400 active:bg-vl-cyan-600 active:scale-[0.98] focus-visible:ring-vl-dark-900",
        /**
         * secondary — Neutral background, dark text, subtle border.
         * Secondary and supporting actions.
         */
        secondary:
          "bg-secondary text-secondary-foreground border border-border/40 hover:bg-neutral-200/80 active:scale-[0.98] dark:hover:bg-neutral-800",
        /**
         * outline — Transparent background, visible semantic border.
         * Boundaried actions with hover fill.
         */
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground active:scale-[0.98] focus-visible:ring-vl-cyan dark:border-input dark:hover:bg-input/50",
        /**
         * ghost — Transparent background, subtle hover.
         * Minimal toolbar, close, and icon controls.
         */
        ghost:
          "border-transparent bg-transparent hover:bg-muted hover:text-foreground active:scale-[0.98] focus-visible:ring-vl-cyan font-normal normal-case tracking-normal",
        /**
         * destructive — Light red background, red text.
         * Destructive confirmation and warning actions.
         */
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 border border-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        /**
         * link — Transparent, borderless, text-based appearance.
         * Inline actions and navigation links.
         */
        link: "text-primary underline-offset-4 hover:underline border-transparent bg-transparent shadow-none font-normal normal-case tracking-normal",
        /**
         * danger — Solid red background, white text.
         * High-contrast permanent deletion and critical actions.
         */
        danger:
          "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500 font-medium active:scale-[0.98]",
      },
      size: {
        /** xs — 28px compact actions */
        xs: "h-7 gap-1 px-2 text-2xs in-data-[slot=button-group]:rounded-brand [&_svg:not([class*='size-'])]:size-3",
        /** sm — 32px small controls (filters, table actions, small pills) */
        sm: "h-8 gap-1.5 px-3 text-xs in-data-[slot=button-group]:rounded-brand [&_svg:not([class*='size-'])]:size-3.5",
        /** default — 40px standard actions (inputs, forms, admin, dialogs) */
        default: "h-10 gap-2 px-4 text-xs font-bold tracking-wider",
        /** lg — 48px prominent storefront CTAs (Add to cart, Checkout, Place Order, Hero) */
        lg: "h-12 gap-2.5 px-6 text-xs font-black tracking-widest",
        /** xl — alias to 48px prominent action */
        xl: "h-12 gap-2.5 px-6 text-xs font-black tracking-widest",
        /** 2xl — alias to 48px prominent action */
        "2xl": "h-12 gap-2.5 px-6 text-xs font-black tracking-widest",
        /** icon — 32px icon actions */
        icon: "size-8",
        /** icon-xs — 24px compact icon */
        "icon-xs":
          "size-6 in-data-[slot=button-group]:rounded-brand [&_svg:not([class*='size-'])]:size-3",
        /** icon-sm — 28px small icon (dialogs/sheets) */
        "icon-sm":
          "size-7 in-data-[slot=button-group]:rounded-brand [&_svg:not([class*='size-'])]:size-3.5",
        /** icon-lg — 36px large icon */
        "icon-lg": "size-9 [&_svg:not([class*='size-'])]:size-4.5",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        className: "h-auto p-0 shadow-none font-normal normal-case tracking-normal",
      },
      {
        variant: "ghost",
        className: "font-normal normal-case tracking-normal",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
      fullWidth: false,
    },
  }
);

export interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  fullWidth?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      fullWidth = false,
      loading = false,
      disabled,
      asChild = false,
      nativeButton,
      children,
      ...props
    },
    ref
  ) => {
    const isCustomRenderNonButton =
      nativeButton === undefined &&
      (asChild
        ? React.isValidElement(children) && (children as React.ReactElement).type !== "button"
        : React.isValidElement(props.render) && props.render.type !== "button");

    const effectiveRender =
      asChild && React.isValidElement(children) ? (children as React.ReactElement) : props.render;

    const effectiveChildren = asChild ? undefined : loading ? (
      <>
        <LoaderCircle
          className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        {children}
      </>
    ) : (
      children
    );

    return (
      <ButtonPrimitive
        ref={ref}
        data-slot="button"
        data-loading={loading ? "" : undefined}
        aria-busy={loading ? "true" : undefined}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        nativeButton={isCustomRenderNonButton ? false : nativeButton}
        render={effectiveRender}
        {...props}
      >
        {effectiveChildren}
      </ButtonPrimitive>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
