# 06 — Component Consistency & Primitive Adoption Audit

> **Objective:** Evaluate reusable UI components, compare central primitives against raw implementations, document variant drift, and identify consolidation opportunities.

---

## 1. The Primitive Adoption Gap (Primary Architectural Finding)

The central shadcn UI primitives located in `src/components/ui/` are drastically under-utilized across the codebase. Instead of importing and configuring `<Button>`, `<Input>`, and `<Card>`, developers predominantly wrote raw HTML tags with massive, duplicated class strings:

| Component Type | Central Primitive Usage | Raw HTML Tag Usage | Primitive Adoption Rate |
|---|---|---|---|
| **Buttons** | `<Button>`: **70** | `<button>`: **471** | **12.9%** (87% bypass primitive) |
| **Inputs** | `<Input>`: **66** | `<input>`: **216** | **23.4%** (76% bypass primitive) |
| **Cards** | `<Card>`: **14** | Custom `div`: **~150** | **8.5%** (91% bypass primitive) |
| **Badges** | `<Badge>`: **90** | Custom `span`: **~120** | **42.8%** |

### Root Cause Analysis: Why Did Developers Bypass the Primitives?

1. **Dimensional Incompatibility (`h-8` Default):**  
   The base-nova shadcn `Button` and `Input` components default to `h-8` (32px). While 32px works well for compact desktop tables, it is **unusable for mobile e-commerce touch targets** (which require 44px–48px). Developers writing checkout and mobile storefront pages could not use `Button`, so they hand-rolled `<button className="min-h-12 w-full rounded-xs bg-vl-black...">`.
2. **Radius Incompatibility (`rounded-lg` vs `rounded-xs`):**  
   The base-nova `Card` defaults to `rounded-xl` and `ring-1 ring-foreground/10`. VibeLock's storefront branding uses `rounded-xs` or `rounded-none` with subtle borders. Using `<Card>` would have distorted the brand's sharp streetwear visual language.

---

## 2. In-Depth Component Analysis

### 2.1 Buttons

#### Central Implementation: `src/components/ui/button.tsx`
- **Variants Declared:** `default` (primary dark), `outline`, `secondary`, `ghost`, `destructive`, `link`, `cyan` (electric glow), `brand` (obsidian + border).
- **Sizes Declared:** `xs` (24px), `sm` (28px), `default` (32px), `lg` (36px), `icon` (32px), `icon-xs`, `icon-sm`, `icon-lg`.
- **Missing Sizes:** No `xl` (44px) or `2xl` (48px) size exists in the primitive!

#### Inconsistencies & Duplications:
- In `src/components/storefront/checkout/checkout-form.tsx:1044`, the primary checkout submit button is a raw `<button>` with 24 utility classes:
  ```tsx
  className="font-heading bg-vl-black text-vl-white focus-visible:ring-vl-cyan mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xs px-5 text-xs font-black tracking-widest uppercase transition-all duration-200 hover:bg-black hover:shadow-[0_0_24px_rgba(0,217,255,0.25)] focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
  ```
- In `src/app/(auth)/login/page.tsx:392`, the login CTA uses another custom button implementation with `h-11 rounded-lg bg-[#00D9FF] text-[#101114]`.

#### Recommendation:
Add `xl` (`h-11` / 44px) and `2xl` (`h-12` / 48px) sizes to `buttonVariants`, and add a `streetwear` variant with `rounded-xs font-black tracking-widest uppercase`.

---

### 2.2 Inputs

#### Central Implementation: `src/components/ui/input.tsx`
- **Base Classes:** `h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors md:text-sm`
- **Styling Incompatibilities:** Hardcoded `h-8` (32px) and `rounded-lg` (8px).

#### Raw Input Divergence:
- **Checkout Form Inputs (`checkout-form.tsx:320`):**
  `h-11 rounded-xs border-[#101114]/20 bg-white px-3.5 text-sm`
- **Coupon Code Input (`checkout-form.tsx:986`):**
  `h-9 rounded-xs border-[#101114]/20 bg-white font-mono text-xs tracking-wider uppercase`
- **Auth Inputs (`login/page.tsx:334`):**
  Uses `<Input>` but overrides with `h-11 rounded-lg border-white/10 bg-[#16171B] text-[#F3F0E8]`

#### Recommendation:
Add size variants to `src/components/ui/input.tsx`:
- `size: "default"` (`h-9` / 36px)
- `size: "lg"` (`h-11` / 44px) for mobile-first checkout forms
- `size: "sm"` (`h-8` / 32px) for admin data tables

---

### 2.3 Cards & Containers

#### Central Implementation: `src/components/ui/card.tsx`
- **Base Classes:** `rounded-xl ring-1 ring-foreground/10 bg-card text-card-foreground`
- **Usage:** Used only 14 times in the entire application (primarily admin KPI cards).

#### Custom Card Proliferation:
Every major feature created its own bespoke card container:
- **Storefront Checkout Section:** `border-border bg-background rounded-xs border p-5 sm:p-6`
- **Storefront Cart Item:** `border-border bg-background rounded-xs border p-4 sm:p-5`
- **Account Dashboard Card:** `border-[#101114]/10 bg-white rounded-lg border p-6`
- **Admin Customer Timeline:** `border-[#101114]/10 bg-white rounded-xl border p-5`

#### Recommendation:
Add `variant="sharp"` (`rounded-xs border border-border bg-background`) to `src/components/ui/card.tsx` so storefront and checkout components can adopt the central `<Card>`.

---

### 2.4 Badges

VibeLock currently maintains **three competing badge implementations**:

1. **`src/components/ui/badge.tsx` (Shadcn Badge):**
   - Pill-shaped (`rounded-4xl`), 20px high (`h-5`), variants: `default`, `secondary`, `destructive`, `outline`, `cyan`, `brand`.
2. **`src/components/storefront/catalog/product-badge.tsx` (`ProductBadge`):**
   - Rectangular (`rounded-xs`), `text-[10px] tracking-wider uppercase`, variants: `default` (black), `sale` (red `#E50010`), `new`, `featured` (amber).
3. **`src/components/shared/payment-gateway-badge.tsx` (`PaymentGatewayBadge`):**
   - Compact rectangular badge (`rounded-xs px-1.5 py-0.5 text-[10px]`), dedicated gateway color mappings (SSLCOMMERZ, bKash, Nagad, COD).

#### Assessment:
- The separation between `ProductBadge` (streetwear sale tags) and `PaymentGatewayBadge` (financial gateway identification) is **functionally justified**.
- However, `ProductBadge` should reference central semantic colors (`--color-status-sale`) instead of hardcoding `#E50010`.

---

### 2.5 Product Cards (`src/components/storefront/catalog/product-card.tsx`)

- **Aspect Ratio:** Fixed `2 / 3` (`style={{ aspectRatio: "2 / 3" }}`).
- **Image Treatment:** Dual-layer crossfade on hover (`group-hover:scale-105`, secondary image `opacity-0 group-hover:opacity-100`).
- **Wishlist Integration:** Optimistic client-side toggle synced with localStorage and server snapshot via `useSyncExternalStore`.
- **Consistency Status:** **High**. The product card is uniform across Homepage, Catalog, Category pages, and Search results.

---

### 2.6 Tables & Data Grids

- **Admin Tables (`src/components/admin/*/`):**  
  Uses `src/components/ui/table.tsx` with high consistency:
  - Header: `bg-neutral-50/50 text-[11px] font-bold tracking-wider text-muted-foreground uppercase`
  - Rows: `hover:bg-neutral-50/80 transition-colors text-xs border-b border-[#101114]/5`
  - Actions: Sticky right column on horizontal overflow with `bg-white/95 backdrop-blur-xs`
- **Reusability Controls:** Built using `AdminTableControls`, `AdminTableColumnVisibility`, and `AdminTableInfiniteScroll`.

---

### 2.7 Dialogs, Drawers & Sheets

- **Modals:** Built on `@base-ui/react/dialog` via `src/components/ui/dialog.tsx`.
- **Slide-Out Drawers:** Built on `src/components/ui/sheet.tsx` (Search drawer, Mobile admin menu, Cart drawer).
- **Z-Index System:**
  - Header: `z-50`
  - Modals / Dialogs: `z-50`
  - Overlays: `z-40`
  - Sticky table headers: `z-20`
  - Thermal print receipts: `z-[9999999]` (in print stylesheet)

---

### 2.8 Feedback & Alerts

- **Toaster:** Centralized on `sonner` via `src/components/ui/sonner.tsx` mounted in `RootLayout`.
- **Position:** `top-center` with `richColors` and `duration: 3500ms`.
- **Inline Alerts:** Handled via custom warning banners (`rounded-xs border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900`).

