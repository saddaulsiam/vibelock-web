# Phase 2 — 07: Token-to-Component Mapping Matrix

> **Scope:** Full cross-reference mapping Phase 1 design tokens in `src/app/globals.css` to their target component properties and classes.  
> **Status:** READ-ONLY Architectural Specification

---

## 1. Brand & Surface Color Mapping

| Phase 1 Design Token | Generated Tailwind Utility | Target Component Class Replacement | Affected Components & Files |
|---|---|---|---|
| `--color-vl-black` (`#101114`) | `bg-vl-black`, `text-vl-black`, `border-vl-black` | `bg-[#101114]` → `bg-vl-black`<br/>`text-[#101114]` → `text-vl-black`<br/>`border-[#101114]` → `border-vl-black` | `Button`, `Input`, `ProductCard`, `AddToCartButton`, `CheckoutForm`, `AdminSidebar` (173 files) |
| `--color-vl-white` (`#f3f0e8`) | `bg-vl-white`, `text-vl-white`, `border-vl-white` | `bg-[#F3F0E8]` → `bg-vl-white`<br/>`text-[#F3F0E8]` → `text-vl-white` | `AdminLayout`, `ProductBadge`, `Header`, `AccountShell`, `CheckoutForm` (74 files) |
| `--color-vl-cyan` (`#00d9ff`) | `bg-vl-cyan`, `text-vl-cyan`, `border-vl-cyan` | `bg-[#00D9FF]` → `bg-vl-cyan`<br/>`text-[#00D9FF]` → `text-vl-cyan`<br/>`ring-[#00D9FF]` → `ring-vl-cyan` | `Button (cyan)`, `SectionHeading`, `Login`, `Register`, `Header`, `Badge` (116 files) |
| `--color-vl-cyan-light` (`#2ae0ff`) | `bg-vl-cyan-light`, `hover:bg-vl-cyan-light` | `hover:bg-[#2ae0ff]` → `hover:bg-vl-cyan-light` | `Button (cyan)` hover state, `HeroSection` glow |
| `--color-vl-cyan-dark` (`#0088a8`) | `text-vl-cyan-dark`, `border-vl-cyan-dark` | `text-[#0088a8]` → `text-vl-cyan-dark` | Accessible light-mode cyan text, active button states |
| `--color-vl-grey` (`#777982`) | `text-vl-grey` | `text-[#777982]` → `text-vl-grey` | `LoginForm`, `RegisterForm`, `Footer`, `AdminSidebar` subtitle |
| `--color-vl-border` (`#303137`) | `border-vl-border` | `border-[#303137]` → `border-vl-border` | Dark cards, `Footer` top divider, `Auth` input borders |
| `--color-surface-warm-soft` (`#faf9f5`) | `bg-surface-warm-soft` | `bg-[#FAF9F5]` → `bg-surface-warm-soft` | Checkout order summary panel, Cart sidebar |
| `--color-surface-cream` (`#fbf9f5`) | `bg-surface-cream` | `bg-[#FBF9F5]` → `bg-surface-cream` | Storefront catalog drop cards |
| `--color-surface-dark` (`#16171b`) | `bg-surface-dark`, `border-surface-dark` | `bg-[#16171B]` → `bg-surface-dark` | Auth inputs, dark popovers, modal dialog cards |
| `--color-surface-dark-deep` (`#0c0d10`) | `bg-surface-dark-deep` | `bg-[#0C0D10]` → `bg-surface-dark-deep` | Auth split photography background panel |

---

## 2. Micro-Typography & Letter Spacing Mapping

| Phase 1 Design Token | Generated Tailwind Utility | Target Component Class Replacement | Affected Components & Files |
|---|---|---|---|
| `--text-3xs` (`8px`) | `text-3xs` | `text-[8px]` → `text-3xs` | Header mobile cart counter bubble |
| `--text-2xs` (`10px`) | `text-2xs` | `text-[10px]` → `text-2xs` | `ProductBadge`, `SectionHeading` eyebrow, uppercase tracking tags (457x) |
| `--text-compact` (`11px`)| `text-compact` | `text-[11px]` → `text-compact` | `ProductCard` category, breadcrumbs, table headers (471x) |
| `--tracking-streetwear` (`0.2em`)| `tracking-streetwear` | `tracking-[0.2em]` → `tracking-streetwear` | Editorial badges, hero edition subtitles |
| `--tracking-tag` (`0.25em`) | `tracking-tag` | `tracking-[0.25em]` → `tracking-tag` | Eyebrow headers, auth uppercase titles |

---

## 3. Border Radius Mapping

| Phase 1 Design Token | Generated Tailwind Utility | Target Component Class Replacement | Affected Components & Files |
|---|---|---|---|
| `--radius-sharp` (`0px`) | `rounded-sharp` | `rounded-none` → `rounded-sharp` | Storefront `ProductCard` image canvas |
| `--radius-brand` (`4px`) | `rounded-brand` | `rounded-xs` → `rounded-brand` | `Button (streetwear)`, `Input (brand)`, `ProductBadge`, `CheckoutForm` |
| `--radius-ui` (`8px`) | `rounded-ui` | `rounded-lg` / `rounded-md` → `rounded-ui` | Admin data tables, auth inputs, modal dialogs |
| `--radius-pill` (`9999px`)| `rounded-pill` | `rounded-full` → `rounded-pill` | `Badge`, floating header navbar, customer avatars |

---

## 4. Shadow & Elevation Mapping

| Phase 1 Design Token | Generated Tailwind Utility | Target Component Class Replacement | Affected Components & Files |
|---|---|---|---|
| `--shadow-cyan-glow` | `shadow-cyan-glow` | `shadow-[0_0_24px_rgba(0,217,255,0.25)]` → `shadow-cyan-glow` | `Button (streetwear)`, checkout submit button |
| `--shadow-cyan-glow-sm` | `shadow-cyan-glow-sm` | `shadow-[0_0_14px_rgba(0,217,255,0.2)]` → `shadow-cyan-glow-sm` | Cyan badges, POS active icons |
| `--shadow-cyan-glow-lg` | `shadow-cyan-glow-lg` | `shadow-[0_0_32px_rgba(0,217,255,0.4)]` → `shadow-cyan-glow-lg` | Hero primary action button |
| `--shadow-floating-nav` | `shadow-floating-nav` | `shadow-[0_8px_30px_rgba(0,0,0,0.25)]` → `shadow-floating-nav` | Storefront floating header navbar |

---

## 5. Z-Index & Motion Mapping

| Phase 1 Design Token | Generated Tailwind Utility | Target Component Class Replacement | Affected Components & Files |
|---|---|---|---|
| `--z-sticky-table` (`20`) | `z-sticky-table` | `z-20` → `z-sticky-table` | `AdminOrdersTable`, `AdminProductsTable` sticky headers |
| `--z-overlay` (`40`) | `z-overlay` | `z-40` → `z-overlay` | Dialog backdrops, sheet overlay |
| `--z-modal` (`50`) | `z-modal` | `z-50` → `z-modal` | `DialogContent`, `SheetContent` |
| `--z-nav` (`50`) | `z-nav` | `z-50` → `z-nav` | Storefront `Header`, `AdminHeader` |
| `--z-toast` (`100`) | `z-toast` | `z-[100]` → `z-toast` | `Sonner` toast container |
| `--z-print` (`9999999`) | `z-print` | `z-[9999999]` → `z-print` | POS thermal receipt print isolation canvas |
| `--animate-marquee` | `animate-marquee` | Inline marquee style → `animate-marquee` | Storefront announcement ticker |
| `--animate-blink` | `animate-blink` | Inline pulse animation → `animate-blink` | Order status and live stock dots |

