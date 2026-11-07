# Phase 2D: SelectableCard API Proposal
## Reusable Form Option Card Specification

**Status:** PROPOSAL (READ-ONLY)  
**Target Path:** `src/components/shared/selectable-card.tsx`  
**Architecture:** Lightweight primitive wrapping semantic `<label>` + native `<input type="radio">` with CVA variants.

---

## 1. Architectural Principles

1. **Lightweight & Transparent:** No unneeded abstraction layers. It remains an HTML `<label>` with a real `<input type="radio">`.
2. **Accessible by Default:** Full native keyboard accessibility (`Tab`, `Space`, `ArrowUp`, `ArrowDown`), `aria-disabled`, and native form serialization.
3. **Flexible Slot Topology:**
   - Supports simple title + description layouts
   - Supports custom right-aligned trailing badges or prices
   - Supports completely arbitrary children when maximum customization is needed
4. **Token Driven:** Uses Phase 1 tokens (`--radius-brand`, `--color-vl-black`, `--color-vl-white`).

---

## 2. Proposed Component Interface

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

export const selectableCardVariants = cva(
  [
    "group flex cursor-pointer rounded-brand border transition-all duration-150 outline-none select-none",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "focus-within:ring-2 focus-within:ring-vl-cyan focus-within:ring-offset-1",
  ],
  {
    variants: {
      variant: {
        /**
         * brand (default): VibeLock streetwear style.
         * White background at rest; subtle linen/cream tint and vl-black border when active.
         */
        brand: "",
        /**
         * dark: Dark operations / POS / Auth modal variant.
         * Surface-dark background with border-dark at rest.
         */
        dark: "border-border-dark bg-surface-dark text-vl-white",
      },
      size: {
        default: "p-4 gap-3.5",
        sm: "p-3.5 gap-2.5",
      },
      isSelected: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "brand",
        isSelected: true,
        className:
          "border-vl-black bg-vl-white/65 shadow-xs ring-1 ring-vl-black text-[#101114]",
      },
      {
        variant: "brand",
        isSelected: false,
        className:
          "border-border bg-white hover:border-vl-black/40 text-[#101114]",
      },
      {
        variant: "dark",
        isSelected: true,
        className:
          "border-vl-cyan bg-surface-dark-deep shadow-xs ring-1 ring-vl-cyan",
      },
      {
        variant: "dark",
        isSelected: false,
        className:
          "border-border-dark bg-surface-dark hover:border-vl-cyan/40",
      },
    ],
    defaultVariants: {
      variant: "brand",
      size: "default",
      isSelected: false,
    },
  }
);

export interface SelectableCardProps
  extends Omit<React.ComponentProps<"label">, "onChange">,
    VariantProps<typeof selectableCardVariants> {
  /** Radio group name */
  name: string;
  /** Radio value */
  value: string;
  /** Whether option is currently active */
  checked: boolean;
  /** Selection change callback */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Primary label/title */
  title?: React.ReactNode;
  /** Secondary subtitle or helper note */
  description?: React.ReactNode;
  /** Right-aligned slot (e.g. price indicator or badge) */
  trailing?: React.ReactNode;
  /** Input ref if needed for focus trapping */
  inputRef?: React.Ref<HTMLInputElement>;
}
```

---

## 3. Usage Examples

### A. Shipping Method Option (Title, Subtitle, Price Trailing Slot)
```tsx
<SelectableCard
  name="shippingMethodSelection"
  value={method.id}
  checked={selectedShippingMethodId === method.id}
  size="sm"
  onChange={() => {
    setSelectedShippingMethodId(method.id);
    if (errors.shippingCity) {
      setErrors((prev) => ({ ...prev, shippingCity: undefined }));
    }
  }}
  title={
    <span className="block text-xs font-bold text-[#101114] uppercase">
      {method.name}
    </span>
  }
  description={
    <span className="text-muted-foreground block text-[11px]">
      {method.zoneName} · Doorstep
    </span>
  }
  trailing={
    <span className="shrink-0 text-xs font-black text-[#101114]">
      {formatPrice(method.cost)}
    </span>
  }
/>
```

### B. Payment Method Option (Title, Custom Header Badges, Body Description)
```tsx
<SelectableCard
  name="paymentMethod"
  value={method.value}
  checked={paymentMethod === method.value}
  size="default"
  onChange={() => setPaymentMethod(method.value)}
>
  <div className="min-w-0 flex-1">
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-[#101114]">{method.title}</span>
      {method.value === "COD" && (
        <span className="bg-vl-black/5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#101114] uppercase">
          Popular in BD
        </span>
      )}
      {method.value === "ONLINE" && (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500">
          <CreditCard className="size-3.5" />
          Cards / Mobile Banking (SSLCOMMERZ)
        </span>
      )}
    </div>
    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
      {method.detail}
    </p>
  </div>
</SelectableCard>
```

---

## 4. Accessibility & Interaction Specs

1. **Focus Ring:** When navigating via `Tab` or arrow keys, `focus-within:ring-2 focus-within:ring-vl-cyan` provides an accessible, high-contrast indicator.
2. **Screen Reader Experience:** The `<input type="radio">` remains in the accessibility tree and is associated with its label, reading title, description, and trailing content naturally.
3. **No Over-Engineering:** Does not introduce redundant custom keyboard hooks because native radio inputs inside a common `name` group automatically handle arrow-key navigation per WAI-ARIA standards.

