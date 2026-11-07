import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const textareaVariants = cva(
  // Base — mirrors Input primitive: same border, focus ring, disabled, aria-invalid patterns
  [
    "border-input placeholder:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-ring/50",
    "disabled:bg-input/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "w-full min-w-0 border bg-transparent px-3 py-2 text-sm transition-colors outline-none",
    "focus-visible:ring-3",
    "resize-y",
  ],
  {
    variants: {
      variant: {
        /** Default — matches Input primitive aesthetic (rounded-lg, light border) */
        default: "rounded-lg",
        /** Brand — storefront style: sharp 4px radius, vl-black border on focus */
        brand:
          "rounded-[var(--radius-brand)] border-neutral-200 focus-visible:border-vl-black focus-visible:ring-vl-black/10",
        /** Dark — auth/POS dark-surface style.
         *  bg: --color-surface-dark (#16171b)  — established token (24 occurrences)
         *  border: --color-border-dark-input (#2a2d33) — intentionally lighter than
         *    --color-border-dark (#303137) so an input border reads against surface-dark */
        dark: "rounded-[var(--radius-ui)] bg-surface-dark border-[var(--color-border-dark-input)] text-white placeholder:text-[#6b7280] focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/20",
      },
      size: {
        sm: "min-h-16 text-xs",
        default: "min-h-24",
        lg: "min-h-32",
        xl: "min-h-48",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {}

function Textarea({ className, variant, size, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };

