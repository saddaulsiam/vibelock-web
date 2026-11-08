import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const inputVariants = cva(
  [
    "border-input file:text-foreground placeholder:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-ring/50",
    "disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "w-full min-w-0 border bg-transparent px-3 py-1 text-sm transition-colors outline-none",
    "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "focus-visible:ring-2 focus-visible:ring-vl-cyan disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:ring-3",
  ],
  {
    variants: {
      variant: {
        /**
         * default — standard clean input governed by master brand radius.
         */
        default: "rounded-brand",
        /**
         * brand — Storefront & Checkout style.
         * Governed by master brand radius, clean white surface, subtle
         * obsidian border, and electric cyber cyan focus ring.
         */
        brand:
          "rounded-brand bg-white border-vl-black/15 text-vl-black placeholder:text-muted-foreground hover:border-vl-black/40 focus-visible:border-vl-black focus-visible:ring-2 focus-visible:ring-vl-cyan",
        /**
         * dark — Auth page & POS terminal dark-surface style.
         */
        dark: "rounded-ui bg-surface-dark border-[var(--color-border-dark-input)] text-white placeholder:text-muted-foreground focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/20",
      },
      size: {
        /**
         * sm — h-8 (32px). Admin data-table controls, compact filters.
         */
        sm: "h-8 px-2.5 text-xs",
        /**
         * default — h-10 (40px). Standard general form input.
         */
        default: "h-10 px-3 text-xs",
        /**
         * md — alias to 40px comfortable touch target.
         */
        md: "h-10 px-3 text-xs",
        /**
         * lg — h-11 (44px). General form inputs, checkout address fields.
         */
        lg: "h-11 px-3.5 text-sm",
        /**
         * xl — h-12 (48px). Storefront search bar, prominent single inputs.
         * 48px matches the dominant storefront CTA height.
         */
        xl: "h-12 px-4 text-sm",
        /**
         * 2xl — alias to 48px prominent input.
         */
        "2xl": "h-12 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">, VariantProps<typeof inputVariants> {}

function Input({ className, type, variant, size, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
