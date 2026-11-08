import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";

/**
 * NativeSelect — a styled native <select> element.
 *
 * Use this instead of the Radix/Base UI <Select> when:
 *  - The option list is dynamic (e.g. 64-district dropdown built from API data)
 *  - You need native keyboard navigation and mobile-native picker behaviour
 *  - You are rendering inside a <form> and need a standard form value
 *
 * The Radix <Select> (select.tsx) remains preferred for static option lists
 * that need custom option rendering (icons, descriptions, etc).
 */

const nativeSelectVariants = cva(
  // Base — matches Input primitive patterns: same border, focus ring, disabled, aria-invalid
  [
    "border-input text-foreground",
    "focus-visible:border-ring focus-visible:ring-ring/50",
    "disabled:bg-input/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    // Layout: full-width, left-padded, right-padded for chevron, no native arrow
    "w-full min-w-0 appearance-none border bg-transparent pl-3 pr-8 text-sm transition-colors outline-none",
    "focus-visible:ring-3",
  ],
  {
    variants: {
      variant: {
        /** Default — matches Input and Button aesthetic, governed by master brand radius */
        default: "rounded-brand",
        /** Brand — storefront style: governed by master brand radius, vl-black focus border */
        brand:
          "rounded-brand border-neutral-200 focus-visible:border-vl-black focus-visible:ring-vl-black/10",
        /** Dark — auth/POS dark-surface style */
        dark: "rounded-ui bg-surface-dark border-[var(--color-border-dark-input)] text-white focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400",
      },
      size: {
        sm: "h-7 text-xs",
        default: "h-8",
        lg: "h-10",
        xl: "h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface NativeSelectProps
  extends Omit<React.ComponentProps<"select">, "size">,
    VariantProps<typeof nativeSelectVariants> {
  /** Render a wrapper div with the chevron overlay. Defaults to true. */
  withChevron?: boolean;
}

/**
 * NativeSelect with chevron icon wrapper.
 *
 * When `withChevron` is true (default), the component returns a relative
 * wrapper `<div>` containing the `<select>` and an absolutely-positioned
 * `<ChevronDownIcon>`. Pass `withChevron={false}` if you are building your
 * own wrapper or placing the select inside a custom positioned container.
 */
function NativeSelect({
  className,
  variant,
  size,
  withChevron = true,
  ...props
}: NativeSelectProps) {
  const selectEl = (
    <select
      data-slot="native-select"
      className={cn(nativeSelectVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (!withChevron) return selectEl;

  return (
    <div className="relative w-full">
      {selectEl}
      <ChevronDownIcon
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { NativeSelect, nativeSelectVariants };
