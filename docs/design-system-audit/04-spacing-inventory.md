# 04 — Spacing, Layout & Dimension Audit

> **Objective:** Audit the spatial system, container widths, grid layouts, section rhythm, and component dimensions across VibeLock.

---

## 1. Spacing Scale Architecture

Tailwind CSS operates on a **4px base unit scale** (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px, `p-6` = 24px, etc.). 

VibeLock largely respects the standard Tailwind 4px stepping for component interiors, but exhibits **significant container width fragmentation** across different page layouts.

---

## 2. Container Max-Width Mismatch (Key Finding)

There is no single global container width in VibeLock. Instead, **five competing max-width conventions** are used across different pages:

| Container Scope | Class Declared | Computed Width | Used In | Impact |
|---|---|---|---|---|
| **Shared Container** | `max-w-360` | `1440px` (90rem) | `src/components/shared/container.tsx` (Homepage sections, shop feed) | Wide, expansive desktop canvas |
| **Storefront Header** | `max-w-6xl` | `1152px` (72rem) | `src/components/storefront/layout/header.tsx` (Floating pill navbar) | Narrower than the content below it! |
| **Customer Account** | `max-w-6xl` | `1152px` (72rem) | `src/components/account/layout/account-shell.tsx` | Matches header, but narrower than storefront |
| **Storefront Catalog**| `max-w-7xl` | `1280px` (80rem) | `src/app/(storefront)/shop/page.tsx` & `/category/[slug]` | Intermediate width (1280px) |
| **Admin Operations** | `max-w-[100rem]` | `1600px` (100rem) | Admin products table, orders table, inventory table | Ultra-wide density for multi-column operations |

### Visual Impact of the Header / Content Mismatch
Because the floating header in `header.tsx` is capped at `max-w-6xl` (1152px), on wide monitors (1440px+):
- The floating header terminates at **1152px**.
- The main storefront content inside `<Container>` expands to **1440px**.
- This creates an asymmetrical visual alignment where the page content spills out 144px beyond both edges of the floating header.

**Recommendation:** Harmonize the storefront container hierarchy:
- Primary Storefront Content: `max-w-7xl` (1280px) or `max-w-6xl` (1152px)
- Floating Header: Match the primary content container (`max-w-7xl`)

---

## 3. Section Vertical Cadence

Vertical rhythm is partially centralized in `src/components/shared/section.tsx`:

```tsx
// src/components/shared/section.tsx:9-11
export function Section({ className, as: Component = "section", ...props }: SectionProps) {
  const hasCustomPadding = className && /\b(py-|pt-)/.test(className);
  return (
    <Component className={cn(!hasCustomPadding && "py-6 sm:py-8 lg:py-12", className)} {...props} />
  );
}
```

### Standard Section Cadence:
- **Mobile (<640px):** `py-6` (24px)
- **Tablet (640px–1024px):** `py-8` (32px)
- **Desktop (>1024px):** `py-12` (48px)

### Inconsistencies Detected in Ad-Hoc Sections:
- `src/app/(storefront)/cart/page.tsx`: Uses `py-8 sm:py-12 lg:py-16` (taller vertical padding).
- `src/app/(storefront)/checkout/page.tsx`: Uses `py-6 sm:py-10` (custom step).
- `src/app/(auth)/login/page.tsx`: Uses `p-6 sm:p-10 lg:p-12 xl:p-16` (steep responsive ramp).

---

## 4. Header Heights & Navigation Dimensions

VibeLock operates with three distinct navigation headers:

### 4.1 Storefront Floating Header
- Height: `h-13` (52px / 3.25rem)
- Position: `fixed top-2 sm:top-3 z-50`
- Top padding offset required on page bodies: `pt-20` (80px) to `pt-24` (96px) to avoid content being obscured under the floating navbar.

### 4.2 Admin Operations Header
- Height: `min-h-16` (64px / 4rem)
- Padding: `px-3.5 py-2.5 sm:px-6 sm:py-3 lg:px-8`
- Position: Sticky top border in `src/app/(protected)/admin/layout.tsx`.

### 4.3 POS Cashier Header
- Height: Fluid `py-2 select-none sm:py-2.5`
- Compact layout optimized for touchscreen barcode operations.

---

## 5. Sidebar Dimensions (Admin Dashboard)

The administrative sidebar in `src/components/admin/shared/admin-navigation.tsx` features smooth CSS width transitions between two states:

```tsx
// src/components/admin/shared/admin-navigation.tsx:214
isCollapsed ? "w-18" : "w-64"
```

- **Collapsed State (`w-18`):** `72px` (4.5rem). Icons are centered (`size-10 justify-center`), labels hidden, text tooltips enabled.
- **Expanded State (`w-64`):** `256px` (16rem). Full navigational hierarchy with group separators and chevron indicators.
- **Mobile Navigation:** Handled via a responsive slide-out `<Sheet>` drawer (`w-72` / 288px) on `< lg` viewports.

---

## 6. Touch Targets & Input Sizing Audit

Touch target consistency is critical for an e-commerce platform where over 70% of Bangladeshi traffic originates on mobile devices.

### 44px Minimum Touch Target Compliance

| Component | Desktop Height | Mobile Height | Apple / Android HIG Compliance |
|---|---|---|---|
| **Checkout Primary Button** | `min-h-12` (48px) | `min-h-12` (48px) | **Compliant** (Excellent touch target) |
| **Checkout Form Inputs** | `h-11` (44px) | `h-11` (44px) | **Compliant** |
| **Shadcn `<Button>` Default** | `h-8` (32px) | `h-8` (32px) | **Non-Compliant** (Too small for mobile) |
| **Shadcn `<Input>` Default** | `h-8` (32px) | `h-8` (32px) | **Non-Compliant** (Too small for mobile) |
| **Product Card Wishlist Button** | `size-7` (28px) | `size-7` (28px) | Borderline (Relies on padding for hit area) |
| **Floating Cart Icon in Header**| `size-9` (36px) | `size-8` (32px) | Below 44px recommendation |

**Root Cause Analysis:**  
Because the base shadcn primitives in `src/components/ui/button.tsx` and `input.tsx` default to `h-8` (32px), developers could not use them on mobile-heavy storefront and checkout screens. They had to manually write `h-11` and `h-12` classes on raw HTML tags.

