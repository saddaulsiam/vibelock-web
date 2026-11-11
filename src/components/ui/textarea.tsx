import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const textareaVariants = cva(
  [
    "border-input placeholder:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-ring/50",
    "disabled:bg-input/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "w-full min-w-0 border bg-transparent px-3 py-2 text-sm transition-colors outline-none",
    "focus-visible:ring focus-visible:ring-vl-cyan focus-visible:border-none",
    "resize-y",
  ],
  {
    variants: {
      variant: {
        /** Default — matches Input primitive aesthetic, governed by master brand radius */
        default: "rounded-brand",
        /** Brand — storefront style: governed by master brand radius, clean white surface, subtle obsidian border, cyan focus ring */
        brand:
          "rounded-brand bg-white border-vl-black/15 text-vl-black placeholder:text-muted-foreground hover:border-vl-black/40 focus-visible:border-vl-black focus-visible:ring-2 focus-visible:ring-vl-cyan",
        /** Dark — auth/POS dark-surface style */
        dark: "rounded-ui bg-surface-dark border-[var(--color-border-dark-input)] text-white placeholder:text-muted-foreground focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400",
      },
      size: {
        sm: "min-h-16 text-xs",
        default: "min-h-24 text-sm",
        lg: "min-h-32 text-sm",
        xl: "min-h-48 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface TextareaProps
  extends React.ComponentProps<"textarea">, VariantProps<typeof textareaVariants> {}

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
