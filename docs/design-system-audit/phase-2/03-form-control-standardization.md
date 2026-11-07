# Phase 2 — 03: Form Control Standardization & Missing Primitive Architecture

> **Scope:** Analysis of form controls (inputs, textareas, selects, labels, radios), central primitive enhancement, and specification for missing form primitives.  
> **Status:** READ-ONLY Proposal

---

## 1. Existing Input Primitive & The 216 Raw Input Elements

Location: [`src/components/ui/input.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/ui/input.tsx)  
Built on: `@base-ui/react/input`

### Current Base Classes:
```tsx
"border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none md:text-sm"
```

### The Inconsistency:
Like `Button`, the `Input` primitive is locked to a single desktop height: `h-8` (32px) and `rounded-lg` (8px). 

Because e-commerce checkout forms on mobile devices require **at least 44px height** to prevent keyboard zoom glitches on iOS and ensure thumb accuracy, developers bypassed `<Input>` and wrote **216 custom `<input>` tags**.

---

## 2. Real-World Form Input Patterns

### Pattern A: Storefront Checkout Express Input
- **Locations:** [`src/components/storefront/checkout/checkout-form.tsx:540`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/storefront/checkout/checkout-form.tsx#L540), `address-form.tsx`, `contact-form.tsx`.
- **Inline Classes:**
  ```tsx
  className="h-11 w-full rounded-xs border border-[#101114]/20 bg-white px-3.5 text-sm font-medium transition-colors placeholder:text-neutral-400 hover:border-[#101114]/40 focus:ring-2 focus:ring-[#00D9FF] focus:outline-none"
  ```
- **Attributes:** `h-11` (44px), `rounded-xs` (`--radius-brand`), crisp white background, cyan focus ring.

### Pattern B: Auth Screen Dark Input
- **Locations:** [`src/app/(auth)/login/page.tsx:334`](file:///e:/All%20Project/POS-System/vibelock-web/src/app/(auth)/login/page.tsx#L334), `register/page.tsx`, `forgot-password/page.tsx`.
- **Inline Classes:**
  ```tsx
  className="h-11 w-full rounded-lg border border-white/10 bg-[#16171B] px-3.5 text-sm text-[#F3F0E8] placeholder:text-[#777982] focus:border-[#00D9FF] focus:ring-2 focus:ring-[#00D9FF]/30"
  ```
- **Attributes:** `h-11` (44px), `rounded-lg` (`--radius-ui`), dark surface (`--color-surface-dark`), warm white text (`--color-vl-white`).

### Pattern C: Technical Monospace Promo / Search Input
- **Locations:** Checkout promo input, search modals, POS barcode scanner.
- **Inline Classes:**
  ```tsx
  className="h-9 w-full rounded-xs border border-[#101114]/20 bg-white px-2.5 font-mono text-xs tracking-wider uppercase focus:ring-2 focus:ring-[#00D9FF]"
  ```
- **Attributes:** `h-9` (36px), `font-mono`, uppercase tracking.

---

## 3. Recommended Input Standardization

Enhance [`src/components/ui/input.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/ui/input.tsx) with size and variant props:

```tsx
export interface InputProps extends React.ComponentProps<"input"> {
  inputSize?: "sm" | "default" | "lg";
  variant?: "default" | "brand" | "dark";
}
```

- **`inputSize="default"` (32px):** `h-8 px-2.5 text-sm rounded-ui` (Preserves 100% of existing admin table inputs).
- **`inputSize="lg"` (44px):** `h-11 px-3.5 text-sm rounded-brand` (Matches Pattern A checkout inputs).
- **`variant="brand"`:** `border-border-warm bg-white focus-visible:ring-vl-cyan focus-visible:border-vl-cyan text-vl-black`.
- **`variant="dark"`:** `border-border-dark bg-surface-dark text-vl-white placeholder:text-vl-grey focus-visible:ring-vl-cyan`.

---

## 4. The Missing Textarea Primitive (Critical Gap)

There is currently **NO `textarea.tsx` in `src/components/ui/`**.  
All 28 textareas across customer order notes, customer reviews, contact forms, and admin staff notes are raw, uncentralized `<textarea>` elements.

### Proposed Component: `src/components/ui/textarea.tsx`
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  variant?: "default" | "brand" | "dark";
}

export function Textarea({ className, variant = "default", ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-brand border px-3.5 py-2.5 text-sm transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "default" && "border-input bg-transparent placeholder:text-muted-foreground",
        variant === "brand" && "border-border-warm bg-white text-vl-black placeholder:text-neutral-400 hover:border-vl-black/40",
        variant === "dark" && "border-border-dark bg-surface-dark text-vl-white placeholder:text-vl-grey",
        className
      )}
      {...props}
    />
  );
}
```

---

## 5. Select Dropdown Standardization

### The Current Conflict
- **Desktop/Admin:** [`src/components/ui/select.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/ui/select.tsx) built with `@base-ui/react/select` is excellent for short lists (e.g. order status: Pending, Confirmed, Shipped).
- **Mobile Storefront Checkout:** Bangladesh has **64 districts**. On mobile viewports, `@base-ui` custom popover dropdowns are sluggish and lack mobile-native wheel/picker acceleration. Native `<select>` provides the best conversion rate on iOS Safari and Android Chrome.

### Proposed Architecture:
1. Preserve `@base-ui` `<Select>` for Admin filters and desktop modals.
2. Add a standardized `<NativeSelect>` primitive in `src/components/ui/select-native.tsx`:
   - Height: `h-11` (44px)
   - Styling: `rounded-brand border-border-warm bg-white px-3.5 pr-10 text-sm font-medium`
   - Chevron: Custom inline SVG chevron indicator positioned at `right-3.5`.

---

## 6. The BD Checkout "Selectable Radio Card" Pattern

In [`checkout-form.tsx:825`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/storefront/checkout/checkout-form.tsx#L825), VibeLock implements an e-commerce pattern standard in high-conversion Bangladeshi stores:

```tsx
<label className={`flex cursor-pointer items-start gap-3.5 rounded-xs border p-4 transition-all ${
  isSelected ? "border-[#101114] bg-[#F3F0E8]/60 shadow-xs" : "border-border bg-white hover:border-[#101114]/35"
}`}>
  <input type="radio" className="size-4 accent-[#101114]" />
  <div className="flex-1">
    <div className="flex justify-between">
      <span className="text-sm font-bold text-[#101114]">{title}</span>
      <Badge />
    </div>
    <p className="text-xs text-muted-foreground">{detail}</p>
  </div>
</label>
```

### Standardization Recommendation:
Formalize this pattern into a shared primitive: `src/components/shared/selectable-option-card.tsx` so shipping methods, payment methods, and return reason selectors all inherit identical spacing, border highlights, and token references.

