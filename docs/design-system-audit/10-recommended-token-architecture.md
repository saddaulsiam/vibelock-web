# 10 — Recommended Token Architecture (VibeLock Design System v1.0)

> **Objective:** Define a complete, production-ready design token architecture for VibeLock v1.0, formatted specifically for Tailwind CSS v4 and Next.js App Router, preserving 100% of the approved visual identity.

---

## 1. Architectural Principles

1. **Pixel-Perfect Preservation:** Every token maps to an existing, approved visual value in the application. Zero redesign.
2. **Tailwind CSS v4 Native:** Pure CSS configuration using `@theme` and CSS custom properties; no legacy JavaScript config file.
3. **Dual-Tier Radius Philosophy:** Respects the sharp brutalist aesthetic of the Storefront while supporting the comfortable usability of the Admin Dashboard.
4. **Micro-Typography First:** First-class support for sub-12px dense streetwear technical tags.

---

## 2. Complete Proposed `@theme` Specification

The following block is designed as a clean, backward-compatible drop-in extension for `src/app/globals.css`:

```css
@theme inline {
  /* ══════════════════════════════════════════════════════
     1. TYPEFACES & TYPOGRAPHY
  ══════════════════════════════════════════════════════ */
  --font-sans: var(--font-sans), var(--font-bengali), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-heading: var(--font-heading), var(--font-bengali), sans-serif;
  --font-mono: var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Micro-Typography Font Sizes (Eliminating text-[10px] and text-[11px] arbitrary brackets) */
  --text-3xs: 0.5rem;             /* 8px  — Header mobile cart counter */
  --text-3xs--line-height: 0.75rem;
  --text-2xs: 0.625rem;           /* 10px — Badges, tracking tags, SKU labels */
  --text-2xs--line-height: 0.875rem;
  --text-compact: 0.6875rem;       /* 11px — Metadata, breadcrumbs, table headers */
  --text-compact--line-height: 1rem;

  /* Streetwear Letter Spacing / Tracking */
  --tracking-streetwear: 0.20em;  /* Editorial badges, hero tags */
  --tracking-tag: 0.25em;         /* Eyebrow headers, auth headers */

  /* ══════════════════════════════════════════════════════
     2. CORE BRAND PALETTE
  ══════════════════════════════════════════════════════ */
  --color-vl-black: #101114;       /* Core Obsidian Black */
  --color-vl-white: #f3f0e8;       /* Core Warm Linen Off-White */
  --color-vl-grey: #777982;        /* Core Subtitle Grey */
  --color-vl-border: #303137;      /* Core Dark Mode Border */

  /* Electric Cyan Scale */
  --color-vl-cyan: #00d9ff;        /* Core Electric Cyan */
  --color-vl-cyan-light: #2ae0ff;  /* Hover / Glow highlight */
  --color-vl-cyan-dark: #0088a8;   /* Pressed / High-contrast text state */

  /* Legacy Brand Token Aliases (Preserving existing callers) */
  --color-brand-charcoal: #101114;
  --color-brand-offwhite: #f3f0e8;
  --color-brand-cyan: #00d9ff;

  /* ══════════════════════════════════════════════════════
     3. EXTENDED SURFACES & STATUSES
  ══════════════════════════════════════════════════════ */
  --color-surface-dark: #16171b;   /* Dark cards, modals, popovers */
  --color-surface-dark-deep: #0c0d10; /* Auth photography backdrop */
  --color-surface-warm-soft: #faf9f5; /* Light mode secondary card tint */

  /* Status Colors */
  --color-status-sale: #e50010;    /* Streetwear red sale & discount badge */
  --color-status-success: #10b981; /* Emerald confirmed / paid status */
  --color-status-warning: #f59e0b; /* Amber pending / unpaid status */
  --color-status-error: #ef4444;   /* Destructive / validation error */

  /* Payment Gateway Tokens */
  --color-gateway-sslcommerz: #2563eb; /* SSLCOMMERZ Blue */
  --color-gateway-bkash: #e2136e;      /* bKash Pink */
  --color-gateway-nagad: #f7941d;      /* Nagad Amber */
  --color-gateway-cod: #059669;        /* Cash on Delivery Green */

  /* ══════════════════════════════════════════════════════
     4. SIGNATURE ELEVATION & SHADOWS
  ══════════════════════════════════════════════════════ */
  --shadow-cyan-glow: 0 0 24px rgba(0, 217, 255, 0.28);
  --shadow-cyan-glow-sm: 0 0 14px rgba(0, 217, 255, 0.20);
  --shadow-cyan-glow-lg: 0 0 32px rgba(0, 217, 255, 0.40);
  --shadow-floating-nav: 0 8px 30px rgba(0, 0, 0, 0.25);

  /* ══════════════════════════════════════════════════════
     5. DUAL-TIER BORDER RADIUS
  ══════════════════════════════════════════════════════ */
  --radius-sharp: 0px;             /* Product card images, brutalist banners */
  --radius-brand: 0.25rem;         /* 4px  — Storefront inputs, cards, buttons */
  --radius-ui: 0.5rem;             /* 8px  — Admin tables, auth panels, dialogs */
  --radius-pill: 9999px;           /* Badges, floating header, avatars */

  /* ══════════════════════════════════════════════════════
     6. CONTAINER MAX-WIDTHS
  ══════════════════════════════════════════════════════ */
  --container-storefront: 80rem;   /* 1280px (Standard Max-W-7xl for Catalog) */
  --container-header: 72rem;       /* 1152px (Max-W-6xl for Floating Navbar) */
  --container-admin: 100rem;       /* 1600px (Max-W-100rem for Operations) */
  --breakpoint-8xl: 90rem;
}
```

---

## 3. Light (`:root`) & Dark (`.dark`) Semantic Mapping

```css
:root {
  /* Canvas */
  --background: #f2f2f2;
  --foreground: #101114;

  /* Primary Brand Action */
  --primary: #101114;
  --primary-foreground: #f3f0e8;

  /* Cyber Cyan Accent */
  --accent: #00d9ff;
  --accent-foreground: #101114;

  /* Surfaces & Containers */
  --card: #ffffff;
  --card-foreground: #101114;
  --popover: #ffffff;
  --popover-foreground: #101114;

  /* Muted & Secondary Linen */
  --secondary: #ebe6d9;
  --secondary-foreground: #101114;
  --muted: #ebe6d9;
  --muted-foreground: #666666;

  /* Borders & Inputs */
  --border: #d6d2c4;
  --input: #d6d2c4;
  --ring: #00d9ff;

  /* Base Radius */
  --radius: 0.25rem;
}

.dark {
  /* Canvas */
  --background: #101114;
  --foreground: #f3f0e8;

  /* Primary Action */
  --primary: #f3f0e8;
  --primary-foreground: #101114;

  /* Accent */
  --accent: #00d9ff;
  --accent-foreground: #101114;

  /* Surfaces */
  --card: #16171b;
  --card-foreground: #f3f0e8;
  --popover: #16171b;
  --popover-foreground: #f3f0e8;

  /* Muted Surfaces */
  --secondary: #212228;
  --secondary-foreground: #f3f0e8;
  --muted: #212228;
  --muted-foreground: #777982;

  /* Borders */
  --border: #303137;
  --input: #303137;
  --ring: #00d9ff;
}
```

---

## 4. Design Token Naming Convention

| Token Prefix | Category | Example Utility Generated |
|---|---|---|
| `--color-vl-*` | Core VibeLock Brand Identity | `bg-vl-black`, `text-vl-cyan`, `border-vl-white` |
| `--color-surface-*` | Multi-tier surface backgrounds | `bg-surface-dark`, `bg-surface-warm-soft` |
| `--color-status-*` | Semantic operational states | `text-status-sale`, `bg-status-success` |
| `--text-*` | Typographic scale | `text-2xs` (10px), `text-compact` (11px) |
| `--tracking-*` | Letter spacing | `tracking-streetwear`, `tracking-tag` |
| `--shadow-*` | Atmospheric lighting | `shadow-cyan-glow`, `shadow-floating-nav` |
| `--radius-*` | Corner curvature | `rounded-brand`, `rounded-ui`, `rounded-pill` |

