# 03 — Typography System Inventory & Audit

> **Objective:** Audit font loading, typeface hierarchies, font size scales, font weights, letter spacing, and language rendering across VibeLock.

---

## 1. Typeface Architecture & Font Loading

VibeLock's typography system is configured in `src/app/layout.tsx` using `next/font/google`:

```tsx
// src/app/layout.tsx:9-19
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});
```

These font variables are mapped into Tailwind v4 in `src/app/globals.css`:
```css
@theme inline {
  --font-sans: var(--font-sans);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-geist-mono);
}
```

### Font Family Usage Distribution

| Font Utility | Target Typeface | Exact Frequency | Primary Roles |
|---|---|---|---|
| Default Body | `Inter` (Sans) | Inherited globally | Base application text, inputs, tables, descriptions |
| `font-mono` | System Monospace / Geist Mono | **299** occurrences | SKUs, order numbers, barcode numbers, financial tables, POS slips |
| `font-heading` | `Space_Grotesk` | **215** occurrences | Product card titles, marketing banners, section headings, brand tags |
| `font-sans` | `Inter` (Explicit override) | **9** occurrences | Rare explicit overrides |

---

## 2. The Bengali Typography Gap (Critical Finding)

### Context & Evidence
VibeLock is explicitly built for the **Bangladesh e-commerce market**:
- Currency: BDT (৳ / BDT)
- Payment: bKash, Nagad, SSLCOMMERZ, Cash on Delivery
- Couriers: Steadfast, Pathao
- Customer Input: Bengali customer names, delivery addresses in 64 districts (Dhaka, Chittagong, Sylhet, Pabna, etc.), and Bengali checkout instructions.

### The Problem
In `src/app/layout.tsx`, both `Inter` and `Space_Grotesk` load **only the Latin subset**:
```tsx
subsets: ["latin"] // No 'bengali' subset loaded!
```

Furthermore, no Bengali web font (such as `Noto Sans Bengali` or `Hind Siliguri`) is configured anywhere in the application.

### Visual & Rendering Impact
When customers enter Bengali addresses in checkout or when admin operators review Bengali customer notes:
1. The browser falls back to the operating system's default Bengali font:
   - Windows: `Vrinda` or `Nirmala UI` (dated, inconsistent line-heights, glyph clipping).
   - Android: `Noto Sans Bengali` (clean, but unhinted font-weight rendering).
   - iOS / macOS: `Kohinoor Bangla` (inconsistent vertical metrics with Inter).
2. Because `Space_Grotesk` does not support Bengali glyphs, any Bengali text rendered inside a `font-heading` container defaults to an unstyled OS system serif or generic sans-serif, breaking the futuristic streetwear brand look.

### Recommendation
Add `Hind_Siliguri` or `Noto_Sans_Bengali` from `next/font/google` to `RootLayout` as a fallback in `--font-sans` and `--font-heading`:
```tsx
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-bengali",
});
```

---

## 3. Font Size Distribution & The Micro-Typography Phenomenon

### Standard Tailwind Font Sizes

Our scan of 486 files revealed a clear hierarchy with an overwhelming concentration in compact sizes:

```
text-xs    (12px) : 1,647 occurrences  ████████████████████████████ (56.1%)
text-sm    (14px) :   481 occurrences  ████████ (16.4%)
text-base  (16px) :   106 occurrences  ██ (3.6%)
text-2xl   (24px) :    90 occurrences  █ (3.1%)
text-lg    (18px) :    77 occurrences  █ (2.6%)
text-xl    (20px) :    71 occurrences  █ (2.4%)
text-3xl   (30px) :    65 occurrences  █ (2.2%)
text-4xl   (36px) :    16 occurrences  (0.5%)
text-5xl   (48px) :    10 occurrences  (0.3%)
text-6xl   (60px) :     3 occurrences  (0.1%)
```

### The Sub-12px "Micro-Typography" Phenomenon (966 Occurrences)

Because Tailwind CSS defaults jump directly from `text-xs` (12px) to nothing smaller, developers were forced to declare arbitrary pixel font sizes **nearly a thousand times**:

| Arbitrary Size | Exact Occurrences | Common Usage Contexts |
|---|---|---|
| `text-[11px]` | **471** | Product card categories, table column headers, helper labels, breadcrumbs, rating counts |
| `text-[10px]` | **457** | Badges (`ProductBadge`), uppercase tracking tags, promo codes, card subtitles, footer links |
| `text-[9px]` | **33** | Admin role badges (`ADMIN`, `STAFF`), compact POS thermal receipts, SKU micro-labels |
| `text-[8px]` | **5** | Header floating cart bubble badge on mobile viewports |

**Why this exists:** VibeLock's visual identity relies on **dense, high-precision technical information architecture** (similar to Acronym, NikeLab, and Japanese technical apparel sites). Badges and tags are rendered in small, all-caps, widely tracked text.

**Architecture Flaw:** Without official tokens, developers wrote `text-[11px]` and `text-[10px]` by hand, resulting in arbitrary line-heights and inconsistent baseline alignment.

**Proposed Token Fix:** Register official micro-typography utilities in `@theme`:
```css
--text-2xs: 0.625rem; /* 10px */
--text-2xs--line-height: 0.875rem; /* 14px */
--text-compact: 0.6875rem; /* 11px */
--text-compact--line-height: 1rem; /* 16px */
```

---

## 4. Font Weight Distribution

VibeLock exhibits an intentional, high-contrast weight distribution:

```
font-semibold  (600) : 908 occurrences  ███████████████ (34.8%)
font-bold      (700) : 870 occurrences  ██████████████ (33.3%)
font-medium    (500) : 433 occurrences  ███████ (16.6%)
font-black     (900) : 307 occurrences  █████ (11.8%)
font-normal    (400) :  63 occurrences  █ (2.4%)
font-extrabold (800) :  36 occurrences  (1.4%)
```

### Key Observation: "Ultra-Heavy" Branding
- Over **97% of text** in the application is medium weight (500) or heavier.
- Regular/normal weight (400) is used only 63 times in the entire project!
- `font-black` (900) is used **307 times** as a core aesthetic pillar: page titles, hero headers, buttons, prices, and modal titles are rendered in `font-black` uppercase to give the brand its confident, streetwear punch.

---

## 5. Letter Spacing (Tracking) Matrix

To complement the heavy uppercase typography, letter spacing is extensively modified:

| Tracking Class | Value | Occurrences | Role in VibeLock |
|---|---|---|---|
| `tracking-wider` | `0.05em` | **356** | All-caps buttons, badges, navigation items |
| `tracking-tight` | `-0.025em`| **150** | Large Space Grotesk display headings and numerical totals |
| `tracking-[0.2em]` | `0.20em` | **51** | Editorial tags (`DHAKA STREETWEAR // EDITION 2026`) |
| `tracking-widest` | `0.10em` | **44** | Category subheaders and promo banners |
| `tracking-wide` | `0.025em`| **35** | Subtle label expansion |
| `tracking-[0.25em]`| `0.25em` | **11** | Auth eyebrow headers (`STREETWEAR FOR DHAKA YOUTH`) |
| `tracking-[0.16em]`| `0.16em` | **9** | Order tracking stepper labels |
| `tracking-[0.24em]`| `0.24em` | **8** | Section heading eyebrow text |

**Recommendation:** Formalize high-tracking tokens in `@theme`:
- `--tracking-streetwear: 0.2em;`
- `--tracking-tag: 0.25em;`

---

## 6. Typographic Hierarchy Summary

| Hierarchy Level | Standard Combination | Example Implementation |
|---|---|---|
| **Display H1** | `font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase` | Hero banner, Product details title |
| **Section H2** | `font-heading text-2xl sm:text-3xl md:text-4xl font-black tracking-tight uppercase` | `SectionHeading` title |
| **Card H3** | `text-xs sm:text-[13px] font-bold leading-snug line-clamp-2` | Storefront `ProductCard` title |
| **Eyebrow Tag** | `text-[10px] sm:text-[11px] font-extrabold tracking-[0.24em] text-vl-cyan uppercase` | Above section headings, hero tags |
| **Metadata / SKU** | `font-mono text-xs font-semibold tracking-wider text-muted-foreground` | Product variant SKU, Order # |
| **Body / Description** | `text-xs sm:text-sm font-normal text-muted-foreground leading-relaxed` | Product description, checkout guides |

