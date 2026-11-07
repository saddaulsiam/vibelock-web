# 05 — Radius, Border, Shadow & Surface Elevation Audit

> **Objective:** Audit corner radiuses, border treatments, shadows, and surface elevation effects across the VibeLock application.

---

## 1. Border Radius Fragmentation (Major Architectural Finding)

VibeLock exhibits an unresolved philosophical tension between **brutalist architectural sharpness** and **conventional rounded SaaS components**.

In `src/app/globals.css`, the central token specifies a restrained radius:
```css
/* src/app/globals.css:77 */
:root {
  --radius: 0.25rem; /* 4px — Restrained radius */
}
```
However, the codebase uses **seven different radius utilities**, with softer radiuses outnumbering the official 4px token by more than 8-to-1:

```
rounded-lg   ( 8px) : 461 occurrences  ████████████████████ (27.6%)
rounded-xl   (12px) : 373 occurrences  ████████████████ (22.3%)
rounded-full (Pill) : 289 occurrences  ████████████ (17.3%)
rounded-sm   ( 2px) : 178 occurrences  ███████ (10.7%)
rounded-md   ( 6px) : 149 occurrences  ██████ (8.9%)
rounded-xs   ( 4px) : 124 occurrences  █████ (7.4%)  ← Official --radius Token!
rounded-2xl  (16px) :  95 occurrences  ████ (5.7%)
```

---

## 2. Radius by Application Domain

When broken down by area, the reason for this divergence becomes clear:

### 2.1 Storefront & Checkout (Sharp & Architectural)
- **Product Card Image Canvas:** `rounded-none` (0px sharp corners).
- **Product Badges (`ProductBadge`):** `rounded-xs` (4px).
- **Checkout Form Inputs & Summary Cards:** `rounded-xs` (4px).
- **Primary Checkout Button:** `rounded-xs` (4px).
- **Intent:** Confident, masculine, architectural streetwear aesthetic inspired by Tokyo/London fashion drops.

### 2.2 Customer Auth & Admin Operations (Soft & Rounded)
- **Auth Form Containers:** `rounded-lg` (8px) and `rounded-xl` (12px).
- **Admin KPI Metric Cards:** `rounded-xl` (12px).
- **Admin Sidebar Navigation Links:** `rounded-xl` (12px).
- **Shadcn `<Card>` Primitive:** Hardcoded `rounded-xl` in `src/components/ui/card.tsx`.
- **Shadcn `<Button>` Primitive:** Hardcoded `rounded-lg` in `src/components/ui/button.tsx`.
- **Shadcn `<Input>` Primitive:** Hardcoded `rounded-lg` in `src/components/ui/input.tsx`.

### 2.3 The Architectural Conflict
The default shadcn components shipped with `rounded-lg` and `rounded-xl`. Storefront developers avoided these primitives because they felt "too bubbly" for a streetwear brand, opting for `rounded-xs` or `rounded-none` on raw HTML elements.

**Recommendation:** Formalize a dual-tier semantic radius scale:
1. `--radius-brand: 0.25rem;` (4px / `rounded-xs`) for Storefront, Checkout, and POS.
2. `--radius-ui: 0.5rem;` (8px / `rounded-lg`) for Admin data tables, dialogs, and modals.

---

## 3. Border Treatments & Line Weights

| Border Pattern | Class Declared | Frequency | Role in VibeLock |
|---|---|---|---|
| **Subtle Ink Border** | `border-[#101114]/10` | 84x | Light mode card dividers, table row borders, subtle separation |
| **Medium Ink Border** | `border-[#101114]/20` | 52x | Form inputs, inactive radio options |
| **Warm Theme Border** | `border-border` (`#D6D2C4`) | 48x | Standard card boundary in light theme |
| **Dark Theme Border** | `border-vl-border` (`#303137`) | 35x | Dark mode card borders, footer top line |
| **Translucent Dark** | `border-white/10` | 65x | Admin sidebar divider, dark mode input borders |
| **Cyan Focus Ring** | `focus-visible:ring-vl-cyan` | 112x | Universal accessible focus indicator across all inputs |
| **Brand Emblem Border**| `border-2 border-vl-cyan` | 4x | Floating header circular logo emblem |

---

## 4. Box Shadows & Surface Elevation

Shadows in VibeLock are restrained, with one notable signature exception: **The Cyan Glow**.

```
shadow-2xs  : 364 occurrences  ████████████████████ (63.3%)
shadow-xs   :  97 occurrences  █████ (16.9%)
shadow-2xl  :  47 occurrences  ██ (8.2%)
shadow-sm   :  32 occurrences  █ (5.6%)
shadow-none :  17 occurrences  (3.0%)
shadow-md   :  12 occurrences  (2.1%)
shadow-xl   :   8 occurrences  (1.4%)
shadow-lg   :   6 occurrences  (1.0%)
```

### 4.1 The Dominance of `shadow-2xs`
Tailwind CSS v4 introduces `shadow-2xs` (a microscopic hairline shadow: `0 1px rgb(0 0 0 / 0.05)`). VibeLock uses this heavily in admin tables and cards as a softer alternative to dark borders.

### 4.2 Signature Elevation: The VibeLock Cyan Glow
A defining brand visual is the atmospheric electric cyan glow applied to primary CTAs and active states:

```tsx
// Primary CTA Hover Glow:
shadow-[0_0_24px_rgba(0,217,255,0.25)]

// Floating Header Backdrop Shadow:
shadow-[0_8px_30px_rgba(0,0,0,0.25)]

// POS Header Icon Glow:
shadow-[0_0_16px_rgba(0,217,255,0.4)]
```

**Recommendation:** Promote the hardcoded cyan glow to a first-class shadow token in `@theme`:
```css
--shadow-cyan-glow: 0 0 24px rgba(0, 217, 255, 0.28);
--shadow-cyan-glow-sm: 0 0 14px rgba(0, 217, 255, 0.20);
```

---

## 5. Architectural Texture Overlays

VibeLock uses procedural CSS background patterns to convey an industrial, technical streetwear vibe:

1. **Dark Coordinate Grid (Footer & Auth Hero):**
   ```css
   background-image: linear-gradient(to right, rgba(0, 217, 255, 0.05) 1px, transparent 1px),
                     linear-gradient(to bottom, rgba(0, 217, 255, 0.05) 1px, transparent 1px);
   background-size: 36px 36px;
   ```
2. **Dot Matrix Grid (Customer Account Shell):**
   ```css
   background-image: radial-gradient(rgba(16, 17, 20, 0.13) 1.2px, transparent 1.2px);
   background-size: 30px 30px;
   ```
3. **Atmospheric Radial Glow:**
   ```css
   background: radial-gradient(ellipse at center, rgba(0, 217, 255, 0.08), transparent 70%);
   ```

These textures are visually approved, performant (pure CSS), and should be preserved as standard surface background utilities.

