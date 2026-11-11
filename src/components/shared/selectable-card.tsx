import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const selectableCardVariants = cva(
  "flex cursor-pointer rounded-xs border transition-all duration-150 select-none outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-vl-cyan has-[:focus-visible]:ring-offset-1",
  {
    variants: {
      variant: {
        /**
         * brand (default): VibeLock streetwear storefront style.
         * White at rest, #F3F0E8 linen tint with #101114 border when selected.
         */
        brand: "",
        /**
         * dark: Dark operations / POS / Auth modal variant.
         * Surface-dark background with border-dark at rest, cyan highlight when selected.
         */
        dark: "border-border-dark bg-surface-dark text-vl-white",
      },
      size: {
        /** default: p-4 padding with 14px gap (used in Payment method selection) */
        default: "p-4 gap-3.5",
        /** sm: p-3.5 padding with 10px gap (used in Shipping method selection) */
        sm: "p-3.5 gap-2.5",
      },
      isSelected: {
        true: "",
        false: "",
      },
      withRing: {
        true: "",
        false: "",
      },
      disabled: {
        true: "cursor-not-allowed opacity-50 pointer-events-none",
        false: "",
      },
    },
    compoundVariants: [
      // ── Brand Variant ──────────────────────────────────────────────────────
      {
        variant: "brand",
        isSelected: true,
        withRing: true,
        className: "border-vl-black bg-vl-white-300/70 shadow-xs ring-1 ring-vl-black",
      },
      {
        variant: "brand",
        isSelected: true,
        withRing: false,
        className: "border-vl-black bg-vl-white-300/60 shadow-xs",
      },
      {
        variant: "brand",
        isSelected: false,
        className: "border-border bg-white hover:border-vl-black/40",
      },
      // ── Dark Variant ───────────────────────────────────────────────────────
      {
        variant: "dark",
        isSelected: true,
        withRing: true,
        className: "border-vl-cyan bg-vl-dark-900 shadow-xs ring-1 ring-vl-cyan",
      },
      {
        variant: "dark",
        isSelected: true,
        withRing: false,
        className: "border-vl-cyan bg-vl-dark-900 shadow-xs",
      },
      {
        variant: "dark",
        isSelected: false,
        className: "border-border-dark bg-surface-dark hover:border-vl-cyan-200",
      },
    ],
    defaultVariants: {
      variant: "brand",
      size: "default",
      isSelected: false,
      withRing: false,
      disabled: false,
    },
  }
);

export interface SelectableCardProps
  extends Omit<React.ComponentProps<"label">, "onChange" | "title">,
    VariantProps<typeof selectableCardVariants> {
  /** Radio group name attribute */
  name: string;
  /** Unique value of this option */
  value: string;
  /** Whether this option is selected */
  checked: boolean;
  /** Change event handler */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Optional title slot */
  title?: React.ReactNode;
  /** Optional description/subtitle slot */
  description?: React.ReactNode;
  /** Optional trailing slot (e.g. price badge or icon) */
  trailing?: React.ReactNode;
  /** Optional custom class for the input element */
  inputClassName?: string;
  /** Optional ref for the underlying native input element */
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * SelectableCard — Stateless option card primitive.
 *
 * Wraps a native <input type="radio"> inside an accessible <label> container.
 * Fully supports keyboard navigation (Tab/Arrow keys) and screen readers natively.
 *
 * Supports two content modes:
 * 1. Slot mode: provide `title`, `description`, and/or `trailing`.
 * 2. Children mode: provide `children` for custom layout topologies.
 */
const SelectableCard = React.forwardRef<HTMLLabelElement, SelectableCardProps>(
  (
    {
      className,
      variant = "brand",
      size = "default",
      withRing = false,
      disabled = false,
      name,
      value,
      checked,
      onChange,
      title,
      description,
      trailing,
      inputClassName,
      inputRef,
      children,
      ...props
    },
    ref
  ) => {
    const radioInput = (
      <input
        ref={inputRef}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={Boolean(disabled)}
        onChange={onChange}
        className={cn("mt-0.5 size-4 accent-vl-black shrink-0", inputClassName)}
      />
    );

    return (
      <label
        ref={ref}
        data-slot="selectable-card"
        data-state={checked ? "checked" : "unchecked"}
        data-disabled={disabled ? "true" : undefined}
        className={cn(
          selectableCardVariants({
            variant,
            size,
            isSelected: checked,
            withRing,
            disabled: disabled ? true : false,
          }),
          trailing ? "items-start justify-between" : "items-start",
          className
        )}
        {...props}
      >
        {children ? (
          <>
            {radioInput}
            {children}
          </>
        ) : (
          <>
            <div className="flex items-start gap-2.5 min-w-0">
              {radioInput}
              <div className="min-w-0">
                {title}
                {description}
              </div>
            </div>
            {trailing}
          </>
        )}
      </label>
    );
  }
);

SelectableCard.displayName = "SelectableCard";

export { SelectableCard, selectableCardVariants };
