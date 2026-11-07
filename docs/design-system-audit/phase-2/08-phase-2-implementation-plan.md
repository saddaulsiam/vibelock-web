# Phase 2 Implementation Plan
## VibeLock Design System v1.0 — Component Standardization

**Status:** READ-ONLY PLAN — Awaiting approval before implementation  
**Branch:** `development`  
**Prerequisites:** Phase 1 complete (`src/app/globals.css` tokens in place)  
**Author:** Design System Audit — 2026-11-07

---

## Overview

Phase 2 adds missing primitives, expands existing ones with new variants/sizes, and migrates shared layout components to Phase 1 tokens. All changes are **additive only** — no existing defaults are modified, no pages are redesigned, and visual output is pixel-identical for all existing consumers.

---

## Implementation Phases

### Phase 2a — Primitive Expansion (Additive)

Expand existing shadcn/ui primitives with new **variants** and **sizes** only. Existing defaults are untouched.

#### 2a-1: `src/components/ui/button.tsx`

| Variant | Tokens Used | Pages/Routes Affected | Visual Regression Risk |
|---|---|---|---|
| `streetwear` | `bg-vl-black`, `text-white`, `rounded-brand`, `tracking-widest`, `font-black`, `uppercase`, `min-h-12` | `/shop`, `/products/[slug]`, `/cart`, `/checkout`, `/collections/[slug]` | **ZERO** — new variant, unused by existing consumers |
| `streetwear-outline` | `border-vl-black`, `text-vl-black`, `rounded-brand`, `tracking-widest`, `font-black`, `uppercase`, `hover:bg-vl-black`, `hover:text-white`, `min-h-12` | `/shop`, `/wishlist`, `/products/[slug]` | **ZERO** — new variant |
| `cyan` | `bg-vl-cyan`, `text-vl-black`, `rounded-ui`, `font-semibold`, `h-11` | `/login`, `/register`, `/forgot-password` | **ZERO** — new variant |
| `destructive-inline` | `bg-red-500`, `text-white`, `rounded-ui`, `min-h-7`, `text-xs` | Admin data-tables, inline delete actions | **ZERO** — new variant |
| Size `xl` | `h-14 px-8 text-base` | Storefront primary CTAs | **ZERO** — new size |
| Size `2xl` | `h-16 px-10 text-lg` | Hero section CTAs | **ZERO** — new size |

**Existing defaults preserved:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` — `sm`, `default`, `lg`, `icon` sizes.

---

#### 2a-2: `src/components/ui/input.tsx`

| Variant | Tokens Used | Pages/Routes Affected | Visual Regression Risk |
|---|---|---|---|
| `brand` | `border-vl-black`, `rounded-brand`, `bg-white`, `focus:ring-vl-cyan`, `h-12` | Storefront search, checkout address fields | **ZERO** — new variant |
| `dark` | `bg-[#1a1d21]`, `border-[#2a2d33]`, `text-white`, `placeholder:text-[#6b7280]`, `rounded-ui` | Auth pages (dark background), POS terminal inputs | **ZERO** — new variant |
| Size `lg` | `h-12 px-4 text-base` | Checkout, auth forms | **ZERO** — new size |
| Size `xl` | `h-14 px-5 text-base` | Storefront search bar | **ZERO** — new size |

**Existing defaults preserved:** `default` with `h-9 rounded-md`.

---

#### 2a-3: `src/components/ui/card.tsx`

| Variant | Tokens Used | Pages/Routes Affected | Visual Regression Risk |
|---|---|---|---|
| `brand` | `bg-white`, `border border-vl-black`, `rounded-brand`, `shadow-none` | Storefront checkout sections, product cards | **ZERO** — new variant |
| `panel` | `bg-[#F3F0E8]`, `border-none`, `rounded-ui` | Storefront info panels, FAQ sections | **ZERO** — new variant |
| `dark` | `bg-[#1a1d21]`, `border-[#2a2d33]`, `rounded-ui`, `text-white` | Admin stats cards, dashboard widgets | **ZERO** — new variant |
| `elevated` | `bg-white`, `shadow-md`, `rounded-ui`, `border-none` | Account dashboard cards, order summary | **ZERO** — new variant |

**Existing defaults preserved:** `CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription` — all unchanged.

---

#### 2a-4: `src/components/ui/badge.tsx`

| Variant/Shape | Tokens Used | Pages/Routes Affected | Visual Regression Risk |
|---|---|---|---|
| `sale` | `bg-red-500`, `text-white`, `rounded-brand`, `text-xs`, `font-black`, `uppercase`, `tracking-wider` | Product cards (sale label), shop page | **ZERO** — new variant |
| `success` | `bg-green-100`, `text-green-700`, `border-green-200`, `rounded-ui` | Order status, inventory in-stock | **ZERO** — new variant |
| `warning` | `bg-amber-100`, `text-amber-700`, `border-amber-200`, `rounded-ui` | Order status pending, low stock | **ZERO** — new variant |
| `info` | `bg-blue-100`, `text-blue-700`, `border-blue-200`, `rounded-ui` | Informational labels | **ZERO** — new variant |
| Shape `tag` | `rounded-none`, `border-l-2`, `border-vl-black`, `pl-2` | Product tags, filter chips | **ZERO** — new shape |
| Shape `pill` | `rounded-full` | Notification counts, cart count | **ZERO** — new shape |

**Existing defaults preserved:** `default`, `secondary`, `destructive`, `outline`.

---

### Phase 2b — New Primitive Creation

Create net-new primitive components that do not currently exist in `src/components/ui/`.

#### 2b-1: `src/components/ui/textarea.tsx`

**Rationale:** 28 raw `<textarea>` elements found across the codebase. No shared primitive exists.

| Property | Value |
|---|---|
| Base styles | `w-full rounded-ui border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50` |
| Variants | `default`, `brand`, `dark` |
| Sizes | `sm` (min-h-16), `default` (min-h-24), `lg` (min-h-32) |
| Tokens | `--radius-ui`, `--color-vl-black`, `--color-vl-cyan` |
| Pages affected (migration, later phase) | Contact form, admin notes, product description editor |
| Visual Regression Risk | **ZERO** — new file, opt-in |

---

#### 2b-2: `src/components/ui/select-native.tsx`

**Rationale:** 45 raw `<select>` elements found. The 64-district dropdown in checkout and the province/thana selects need a styled but accessible native select (not Radix `Select` which requires static option lists).

| Property | Value |
|---|---|
| Base styles | `h-10 w-full rounded-ui border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none` |
| Variants | `default`, `brand` |
| Sizes | `sm`, `default`, `lg` |
| Tokens | `--radius-ui`, `--radius-brand`, `--color-vl-black` |
| Pages affected (migration, later phase) | Checkout district/thana/zone dropdowns, admin filters |
| Visual Regression Risk | **ZERO** — new file, opt-in |

---

#### 2b-3: `src/components/shared/selectable-card.tsx`

**Rationale:** Checkout form (`checkout-form.tsx`) contains two inline-defined `SelectableOptionCard`-style patterns (payment method selector and shipping method selector). These are copy-pasted and must be extracted.

| Property | Value |
|---|---|
| Props | `id`, `name`, `value`, `checked`, `onChange`, `label`, `description?`, `icon?`, `badge?`, `disabled?` |
| Base styles | `relative flex cursor-pointer rounded-brand border-2 p-4 transition-colors` |
| Selected state | `border-vl-black bg-vl-black/5` |
| Unselected state | `border-gray-200 bg-white hover:border-gray-400` |
| Disabled state | `opacity-50 cursor-not-allowed` |
| Tokens | `--radius-brand`, `--color-vl-black`, `--color-vl-cyan` |
| Pages affected | `checkout-form.tsx` (payment options, shipping options), potential future settings pages |
| Visual Regression Risk | **ZERO** — extracted from existing inline pattern, pixel-identical |

---

### Phase 2c — Shared Component Token Migration

Migrate shared layout components from inline Tailwind values to Phase 1 design tokens. Visual output is **pixel-identical**.

#### 2c-1: `src/components/shared/container.tsx`

**Current state:** Hardcoded `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` inline.  
**Proposed:** Add `size` prop using `--container-*` tokens from Phase 1.

| Prop Value | Token | Computed Width |
|---|---|---|
| `sm` | `--container-sm` | `640px` |
| `md` | `--container-md` | `768px` |
| `lg` | `--container-lg` | `1024px` |
| `xl` (default) | `--container-xl` | `1280px` |
| `2xl` | `--container-2xl` | `1400px` |
| `full` | `--container-full` | `100%` |

**Migration approach:** Existing consumers pass no `size` prop → default `xl` → resolves to same `max-w-7xl` → **pixel-identical**.  
**Visual Regression Risk:** **ZERO** — backward-compatible default.

---

#### 2c-2: `src/components/shared/section-heading.tsx`

**Current state:** Inline styles for font-size, font-weight, letter-spacing, color.  
**Proposed:** Map to Phase 1 typography tokens.

| Element | Current | Token |
|---|---|---|
| Heading `h2` | `text-3xl font-black tracking-tight text-vl-black` | `text-3xl` → kept, `font-black` → kept, `tracking-tight` → `tracking-tight` token |
| Subheading | `text-sm text-gray-500 uppercase tracking-widest` | `text-2xs` → `--text-2xs`, `tracking-widest` → `tracking-widest` |
| Accent line | `w-12 h-1 bg-vl-cyan` | `bg-vl-cyan` → `--color-vl-cyan` |

**Visual Regression Risk:** **ZERO** — same computed values via tokens.

---

### Phase 2d — Global Utility Classes

Add atmospheric background utility classes to `src/app/globals.css` (Phase 1 file) using `@layer utilities`. These are **new CSS classes only** — no existing rules modified.

| Class | Purpose | Usage |
|---|---|---|
| `.bg-grid-cyber` | Repeating grid overlay (cyber/streetwear aesthetic) | Hero sections, product highlight backgrounds |
| `.bg-grid-dots` | Dot-matrix subtle pattern | Admin dashboard backgrounds, empty states |
| `.bg-radial-glow` | Radial cyan glow effect | Auth pages, landing hero |
| `.bg-noise` | Subtle noise texture via `filter: url(#noise)` | Streetwear texture overlays |
| `.text-gradient-brand` | Gradient text: `vl-black → vl-cyan` | Accent headings |

**Visual Regression Risk:** **ZERO** — new utility classes, not applied to any existing element automatically.

---

## Prioritized Implementation Sequence

| Priority | Tier | Task | Effort | Risk | Dependency |
|---|---|---|---|---|---|
| 1 | 🔴 Critical | `SelectableCard` extraction from `checkout-form.tsx` | Medium | None | None |
| 2 | 🔴 Critical | `Textarea` primitive creation | Low | None | None |
| 3 | 🔴 Critical | `NativeSelect` primitive creation | Low | None | None |
| 4 | 🟠 High | Button variants: `streetwear`, `streetwear-outline`, `cyan` | Low | None | None |
| 5 | 🟠 High | Button sizes: `xl`, `2xl` | Low | None | None |
| 6 | 🟠 High | Input variants: `brand`, `dark`; size `lg`, `xl` | Low | None | None |
| 7 | 🟡 Medium | Badge variants: `sale`, `success`, `warning`, `info` | Low | None | None |
| 8 | 🟡 Medium | Badge shapes: `tag`, `pill` | Low | None | None |
| 9 | 🟡 Medium | Card variants: `brand`, `panel`, `dark`, `elevated` | Low | None | None |
| 10 | 🟢 Low | `Container` size prop addition | Low | None | Phase 1 |
| 11 | 🟢 Low | `SectionHeading` token migration | Low | None | Phase 1 |
| 12 | 🟢 Low | Global utility classes (`.bg-grid-cyber`, etc.) | Low | None | Phase 1 |

---

## Files That Will Change in Phase 2

### Modified Files

| File | Change Type | Risk |
|---|---|---|
| `src/components/ui/button.tsx` | Add variants + sizes (additive) | None |
| `src/components/ui/input.tsx` | Add variants + sizes (additive) | None |
| `src/components/ui/card.tsx` | Add variants (additive) | None |
| `src/components/ui/badge.tsx` | Add variants + shapes (additive) | None |
| `src/app/globals.css` | Add `@layer utilities` classes | None |
| `src/components/shared/container.tsx` | Add optional `size` prop | None |
| `src/components/shared/section-heading.tsx` | Inline → token migration | None |

### New Files

| File | Purpose | Risk |
|---|---|---|
| `src/components/ui/textarea.tsx` | Textarea primitive | None |
| `src/components/ui/select-native.tsx` | Native select primitive | None |
| `src/components/shared/selectable-card.tsx` | Checkout option card primitive | None |

---

## Risk Assessment

### Overall Risk: **LOW**

| Risk Category | Assessment | Mitigation |
|---|---|---|
| Visual regression — primitive expansion | **None** — new variants/sizes are opt-in; zero existing callers | Existing defaults preserved verbatim |
| Visual regression — `Container` prop | **None** — default matches existing hardcoded value | Backward-compatible default |
| Visual regression — `SectionHeading` | **None** — tokens resolve to identical computed values | Verify with computed style comparison |
| Visual regression — `SelectableCard` extraction | **None** — identical markup and styles extracted | Before/after screenshot comparison recommended |
| TypeScript errors | **None** — all additions are properly typed | Run `npm run typecheck` after each file |
| Test breakage | **None** — no business logic changed | Run `npm run test:unit` after implementation |
| Build failure | **None** — additive CSS and TSX only | Run `npx next build` after all changes |
| Accessibility regression | **None** — new primitives follow ARIA patterns | Manual review for `NativeSelect` and `SelectableCard` |

---

## Verification Checklist

After completing Phase 2 implementation, verify:

```bash
# TypeScript
npm run typecheck

# ESLint
npm run lint

# Unit tests
npm run test:unit

# Production build
npx next build
```

Expected results (matching Phase 1 baseline):
- `typecheck` → Exit code 0
- `lint` → Exit code 0
- `test:unit` → 51 files passed, 390 tests passed
- `next build` → Exit code 0, 65 pages compiled

---

## Out of Scope for Phase 2

The following are explicitly excluded from Phase 2:

| Item | Reason |
|---|---|
| Migrating raw `<button>` → `<Button>` in existing pages | Phase 3 (migration phase) |
| Migrating raw `<input>` → `<Input>` in existing pages | Phase 3 (migration phase) |
| Migrating raw `<textarea>` → `<Textarea>` in existing pages | Phase 3 (migration phase) |
| Migrating raw `<select>` → `<NativeSelect>` in existing pages | Phase 3 (migration phase) |
| Replacing `ProductCard` custom component | Permanently excluded |
| Replacing `VibeLockLoader` | Permanently excluded |
| Replacing `PaymentGatewayBadge` | Permanently excluded |
| POS system components | Permanently excluded |
| Any schema / Prisma changes | Never |
| Any auth / payment integration changes | Never |
| Any environment variable changes | Never |

---

## Approval Required

This plan is **READ-ONLY**. No source files have been modified.

To proceed with implementation, explicitly approve:
1. Phase 2a (primitive expansion) — which files to start with
2. Phase 2b (new primitives) — confirm `SelectableCard` extraction scope
3. Phase 2c (shared component migration) — confirm `Container` and `SectionHeading`
4. Phase 2d (global utilities) — confirm utility class names and aesthetics

Approval can be per-tier or for all phases at once.

