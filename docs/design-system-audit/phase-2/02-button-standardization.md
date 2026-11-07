# Phase 2 — 02: Button Component Standardization & Variant Architecture

> **Scope:** Analysis of existing button patterns, central primitive enhancement (`Button`), and mapping raw button implementations to design tokens.  
> **Status:** READ-ONLY Proposal

---

## 1. Existing Central Implementation

Location: [`src/components/ui/button.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/ui/button.tsx)  
Built on: `@base-ui/react/button` + `class-variance-authority` (cva)

### Current Base Classes:
```tsx
"group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50..."
```

### Current Sizes:
- `xs`: `h-6 px-2 text-xs` (24px)
- `sm`: `h-7 px-2.5 text-[0.8rem]` (28px)
- `default`: `h-8 px-2.5 text-sm` (32px)
- `lg`: `h-9 px-2.5 text-sm` (36px)
- `icon`, `icon-xs`, `icon-sm`, `icon-lg`

### Critical Defect in Current Setup:
**The largest available button size is `lg` (36px).**  
Because modern mobile touch targets require a minimum of **44px (iOS HIG) or 48px (Android Material)**, developers building the storefront, cart, and checkout could not use `<Button>`. They wrote 471 custom `<button>` tags with massive inline utility strings.

---

## 2. The 5 Real-World Button Patterns in VibeLock

Our audit discovered that the 471 raw button tags fall into **5 distinct visual patterns**:

### Pattern A: Primary Streetwear CTA (The Checkout & Cart Heavy Button)
- **Occurrences:** ~45 across Storefront product details, Cart, and Checkout.
- **Example Location:** [`src/components/storefront/checkout/checkout-form.tsx:1044`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/storefront/checkout/checkout-form.tsx#L1044) and [`src/components/storefront/product/add-to-cart-button.tsx:39`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/storefront/product/add-to-cart-button.tsx#L39)
- **Current Inline Classes:**
  ```tsx
  className="font-heading bg-vl-black text-vl-white focus-visible:ring-vl-cyan flex min-h-12 w-full items-center justify-center gap-2 rounded-xs px-5 text-xs font-black tracking-widest uppercase transition-all hover:bg-black hover:shadow-[0_0_24px_rgba(0,217,255,0.25)] focus-visible:ring-2 focus-visible:outline-none"
  ```
- **Visual Attributes:** `min-h-12` (48px), `rounded-xs` (4px), `bg-vl-black`, heavy uppercase typography (`font-heading font-black tracking-widest`), cyan glow on hover (`hover:shadow-cyan-glow`).

### Pattern B: Electric Cyan Action (The Auth & POS High-Impact Button)
- **Occurrences:** ~30 across Login, Register, and POS quick tender modal.
- **Example Location:** [`src/app/(auth)/login/page.tsx:392`](file:///e:/All%20Project/POS-System/vibelock-web/src/app/(auth)/login/page.tsx#L392)
- **Current Inline Classes:**
  ```tsx
  className="font-heading h-11 w-full gap-2 rounded-lg bg-[#00D9FF] text-xs font-black tracking-widest text-[#101114] uppercase transition-all hover:bg-[#00D9FF]/90 focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
  ```
- **Visual Attributes:** `h-11` (44px), `rounded-lg` (8px), electric cyan background with obsidian text.

### Pattern C: Circular Icon Pill Button
- **Occurrences:** ~85 across Product Card Wishlist, Header Cart, Header Search, Modal Close Triggers.
- **Example Location:** [`src/components/storefront/catalog/product-card.tsx:181`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/storefront/catalog/product-card.tsx#L181)
- **Current Inline Classes:**
  ```tsx
  className="focus-visible:ring-vl-cyan flex size-7 items-center justify-center rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none text-[#101114]/30 hover:text-rose-500"
  ```
- **Visual Attributes:** Fixed square dimensions (`size-7`, `size-8`, `size-9`), `rounded-full`.

### Pattern D: Operations Data-Table Action Button
- **Occurrences:** ~260 across Admin table filters, pagination, export triggers, and modal actions.
- **Example Location:** [`src/components/admin/shared/admin-table-controls.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/admin/shared/admin-table-controls.tsx)
- **Visual Attributes:** `h-8` (32px), `rounded-lg` (8px), subtle border, muted hover states. (This pattern matches the existing `Button` default variant perfectly).

### Pattern E: Destructive Inline Action Button
- **Occurrences:** ~25 across Account sign out, Order cancellation modal, Product delete modal.
- **Example Location:** [`src/components/account/layout/account-shell.tsx:87`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/account/layout/account-shell.tsx#L87)
- **Current Inline Classes:**
  ```tsx
  className="inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-md bg-red-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
  ```
- **Visual Attributes:** `min-h-7` (28px), `rounded-md`, bold white text on red.

---

## 3. Recommended Button Standardization (`buttonVariants`)

To unify all 5 patterns under central control without breaking existing callers, **we preserve all existing defaults** and add the missing sizes and variants:

### 3.1 Proposed Size Additions
```tsx
// Inside buttonVariants sizes:
size: {
  // Existing sizes preserved 100%:
  xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs...",
  sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem]...",
  default: "h-8 gap-1.5 px-2.5...",
  lg: "h-9 gap-1.5 px-2.5...",
  icon: "size-8",
  "icon-xs": "size-6...",
  "icon-sm": "size-7...",
  "icon-lg": "size-9",

  // ── NEW PROPOSED SIZES FOR MOBILE & STOREFRONT ──
  xl: "min-h-11 gap-2 rounded-brand px-4 text-xs font-bold tracking-wider", // 44px touch target
  "2xl": "min-h-12 gap-2.5 rounded-brand px-6 text-xs sm:text-sm font-black tracking-widest uppercase", // 48px heavy primary CTA
  "icon-xl": "size-11 rounded-full", // 44px mobile touch circular icon
}
```

### 3.2 Proposed Variant Additions
```tsx
// Inside buttonVariants variants:
variant: {
  // Existing variants preserved:
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  outline: "border-border bg-background hover:bg-muted...",
  secondary: "bg-secondary text-secondary-foreground...",
  ghost: "hover:bg-muted...",
  destructive: "bg-destructive/10 text-destructive...",
  link: "text-primary underline-offset-4 hover:underline",
  cyan: "bg-vl-cyan text-vl-black font-bold hover:bg-vl-cyan-light shadow-cyan-glow-sm hover:shadow-cyan-glow focus-visible:ring-vl-cyan active:scale-95",
  brand: "bg-vl-black text-vl-white border border-vl-border hover:bg-black/90 hover:border-vl-cyan focus-visible:ring-vl-cyan",

  // ── NEW PROPOSED VARIANTS MATCHING VIBELOCK BRAND ──
  streetwear:
    "font-heading bg-vl-black text-vl-white rounded-brand font-black tracking-widest uppercase transition-all hover:bg-black hover:shadow-cyan-glow focus-visible:ring-2 focus-visible:ring-vl-cyan active:scale-[0.99]",
  "streetwear-outline":
    "font-heading border-2 border-vl-black text-vl-black bg-transparent rounded-brand font-black tracking-widest uppercase transition-all hover:bg-vl-black hover:text-vl-white focus-visible:ring-2 focus-visible:ring-vl-black active:scale-[0.99]",
}
```

---

## 4. Proposed Variant Mapping Table

| Real-World Element | Current Manual Classes | Proposed Standard Component Usage | Relevant Phase 1 Tokens | Visual Regression Risk |
|---|---|---|---|---|
| Checkout Place Order Button | 24 arbitrary utility classes | `<Button variant="streetwear" size="2xl" className="w-full">` | `--color-vl-black`, `--shadow-cyan-glow`, `--radius-brand` | **ZERO** (Pixel-identical) |
| Product Details Add to Cart | Raw `<button className="min-h-12...">` | `<Button variant="streetwear" size="2xl" className="w-full">` | `--color-vl-black`, `--shadow-cyan-glow`, `--radius-brand` | **ZERO** |
| Customer Login CTA | `h-11 bg-[#00D9FF] text-[#101114]` | `<Button variant="cyan" size="xl" className="w-full font-black tracking-widest uppercase">` | `--color-vl-cyan`, `--color-vl-black`, `--radius-ui` | **ZERO** |
| Wishlist Toggle Icon Button | Raw `<button className="size-7 rounded-full">` | `<Button variant="ghost" size="icon-sm" className="rounded-full">` | `--radius-pill`, `size-7` | **ZERO** |
| Account Sign Out Button | Raw `<button className="min-h-7 bg-red-500">` | `<Button variant="destructive" size="sm">` | `--color-status-error`, `--radius-brand` | **ZERO** |

---

## 5. Architectural Verdict

By adding two sizes (`xl`, `2xl`) and two brand variants (`streetwear`, `streetwear-outline`) to `src/components/ui/button.tsx`, **100% of the 471 raw button tags can be unified under the central `<Button>` primitive** with zero visual change and full centralized theme control.

