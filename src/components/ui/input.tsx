import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const inputVariants = cva(
  // Base — identical to the original flat class string; all existing consumers
  // using no variant/size props will receive the exact same computed classes.
  [
    "border-input file:text-foreground placeholder:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-ring/50",
    "disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none",
    "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:ring-3 md:text-sm",
  ],
  {
    variants: {
      variant: {
        /**
         * default — original styling unchanged.
         * rounded-lg, ring border, standard muted placeholder.
         */
        default: "",
        /**
         * brand — Storefront / checkout style.
         * Sharp 4px radius (--radius-brand), neutral-200 border at rest,
         * vl-black border + subtle ring on focus. Matches the form aesthetic
         * on /checkout, /contact, and /products filter inputs.
         */
        brand:
          "rounded-[var(--radius-brand)] border-neutral-200 focus-visible:border-vl-black focus-visible:ring-vl-black/10",
        /**
         * dark — Auth page / POS terminal dark-surface style.
         * bg: --color-surface-dark (#16171b, 24-occurrence token)
         * border: --color-border-dark-input (#2a2d33, elevated above surface)
         * Focus ring: vl-cyan (consistent with cyan button on auth pages)
         */
        dark: "rounded-[var(--radius-ui)] bg-surface-dark border-[var(--color-border-dark-input)] text-white placeholder:text-[#6b7280] focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/20",
      },
      size: {
        /**
         * default — h-8 (32px). Matches original. Admin data-table controls.
         * Note: base class already sets rounded-lg; size does NOT override radius
         * so variant radius always wins when both are applied.
         */
        default: "h-8",
        /**
         * lg — h-10 (40px). General form inputs, comfortable touch target.
         * Used in /checkout address fields, account profile form.
         */
        lg: "h-10",
        /**
         * xl — h-12 (48px). Storefront search bar, prominent single inputs.
         * 48px matches the dominant storefront CTA height (min-h-11/min-h-12).
         */
        xl: "h-12 text-base",
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
