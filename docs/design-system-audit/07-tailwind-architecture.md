# 07 — Tailwind CSS v4 Architecture & Theme Audit

> **Objective:** Audit the Tailwind CSS v4 CSS-first configuration, inspect `@theme inline`, analyze `:root` and `.dark` mappings, and evaluate compatibility with modern shadcn/base-ui.

---

## 1. Tailwind CSS v4 Foundation Overview

VibeLock is built on modern **Tailwind CSS v4** (`tailwindcss: ^4`, `@tailwindcss/postcss: ^4`).

### Key Architectural Characteristics
1. **CSS-First Configuration:** There is **no `tailwind.config.ts` or `tailwind.config.js`** in the repository. All design token declarations, custom variants, and theme extensions live directly in `src/app/globals.css`.
2. **Modern Package Architecture:**
   ```css
   /* src/app/globals.css:1-3 */
   @import "tailwindcss";
   @import "tw-animate-css";
   @import "shadcn/tailwind.css";
   ```
3. **Custom Dark Mode Variant:**
   ```css
   /* src/app/globals.css:5 */
   @custom-variant dark (&:is(.dark *));
   ```
   This ensures dark mode is activated via a class parent selector (`.dark`) rather than relying on system preferences, allowing manual theme switching and dark-canvas scoping (e.g., auth pages and footers).

---

## 2. The `@theme inline` Configuration

In Tailwind v4, `@theme inline` instructs the compiler to generate utility classes from CSS variables without pre-compiling an external JS configuration object.

### Current Token Declarations:
```css
/* src/app/globals.css:7-45 */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-geist-mono);

  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);

  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* VibeLock Core Brand Tokens */
  --color-vl-black: #101114;
  --color-vl-white: #f3f0e8;
  --color-vl-cyan: #00d9ff;
  --color-vl-grey: #777982;
  --color-vl-border: #303137;

  /* Legacy brand token aliases for backward compatibility */
  --color-brand-charcoal: #101114;
  --color-brand-offwhite: #f3f0e8;
  --color-brand-cyan: #00d9ff;

  --breakpoint-8xl: 90rem;
}
```

---

## 3. Evaluation of Existing Tokens

### What Works Well:
1. **Brand Identity Anchoring:** Declaring `--color-vl-black`, `--color-vl-cyan`, and `--color-vl-white` directly inside `@theme inline` generates first-class utilities (`bg-vl-black`, `text-vl-cyan`, `border-vl-white`, etc.).
2. **Backward Compatibility:** Preserving legacy aliases (`--color-brand-charcoal`, `--color-brand-offwhite`, `--color-brand-cyan`) prevented breakage during earlier codebase refactors.
3. **8xl Breakpoint:** The custom breakpoint `--breakpoint-8xl: 90rem` (1440px) enables wide desktop layout scaling.

### Gaps & Weaknesses in Current Setup:
1. **Missing Typography Extensions in `@theme`:**  
   Font size utilities are not extended in `@theme`. Because `text-[10px]` and `text-[11px]` were never added as `--text-2xs` or `--text-compact`, developers were forced into raw arbitrary brackets `text-[10px]` over 900 times.
2. **Missing Surface Variations:**  
   The secondary off-white and dark shades (`#16171B`, `#2AE0FF`, `#0088A8`) were never added to `@theme`, forcing developers to write arbitrary HEX codes.
3. **Unused CSS Variable in Font Mono:**  
   Line 12 declares `--font-mono: var(--font-geist-mono);`, but `src/app/layout.tsx` does not instantiate or inject `Geist_Mono`! The application relies on system monospace fallbacks.
4. **No Semantic Glow Token:**  
   The signature cyan glow (`0 0 24px rgba(0, 217, 255, 0.25)`) is repeatedly typed out manually rather than declared as `--shadow-cyan-glow`.

---

## 4. Light (`:root`) vs Dark (`.dark`) Theme Analysis

### Light Theme (`:root`):
```css
:root {
  --background: #f2f2f2;
  --foreground: #101114;
  --primary: #101114;
  --primary-foreground: #f3f0e8;
  --accent: #00d9ff;
  --accent-foreground: #101114;
  --card: #ffffff;
  --card-foreground: #101114;
  --popover: #ffffff;
  --popover-foreground: #101114;
  --secondary: #ebe6d9;
  --secondary-foreground: #101114;
  --muted: #ebe6d9;
  --muted-foreground: #666666;
  --destructive: oklch(0.577 0.245 27.325);
  --border: #d6d2c4;
  --input: #d6d2c4;
  --ring: #101114;
  --radius: 0.25rem;
}
```

### Dark Theme (`.dark`):
```css
.dark {
  --background: #101114;
  --foreground: #f3f0e8;
  --primary: #f3f0e8;
  --primary-foreground: #101114;
  --accent: #00d9ff;
  --accent-foreground: #101114;
  --card: #16171b;
  --card-foreground: #f3f0e8;
  --popover: #16171b;
  --popover-foreground: #f3f0e8;
  --secondary: #212228;
  --secondary-foreground: #f3f0e8;
  --muted: #212228;
  --muted-foreground: #777982;
  --destructive: oklch(0.577 0.245 27.325);
  --border: #303137;
  --input: #303137;
  --ring: #00d9ff;
}
```

### Contrast & Accessibility Review
- **Light Theme Foreground on Background (`#101114` on `#F2F2F2`):** Contrast ratio of **16.1:1** (Passes WCAG AAA for all text sizes).
- **Dark Theme Foreground on Background (`#F3F0E8` on `#101114`):** Contrast ratio of **15.6:1** (Passes WCAG AAA).
- **Cyan Accent Text on White (`#00D9FF` on `#FFFFFF`):** Contrast ratio of **1.4:1** (Severe WCAG Fail). Electric cyan must **never be used as body text on light backgrounds**. In dark mode (`#00D9FF` on `#101114`), contrast is **11.2:1** (Passes WCAG AAA).

---

## 5. Architectural Recommendations for Tailwind v4

The Tailwind v4 engine in VibeLock is fast and working perfectly. To unlock full design system centralization, `@theme` needs to be enriched with:
1. **Extended Typography:** Add `2xs: 10px`, `compact: 11px`, and high-tracking letter spacing.
2. **Extended Surface Colors:** Add `--color-vl-surface-dark`, `--color-vl-cyan-light`, and `--color-vl-cyan-dark`.
3. **Extended Shadows:** Add `--shadow-cyan-glow` and `--shadow-cyan-glow-sm`.
4. **Dual Radius System:** Map `--radius-brand: 0.25rem` and `--radius-ui: 0.5rem`.

