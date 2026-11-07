# 11 — Non-Breaking Design System Migration Plan

> **Objective:** Outline a phased, risk-mitigated roadmap for transitioning VibeLock from an emerging, hardcoded styling state to VibeLock Design System v1.0 without breaking any existing UI or interrupting production e-commerce operations.

---

## 1. Safety & Stability Categorization

To guarantee zero accidental regressions, all proposed updates are separated into three distinct risk tiers:

### Tier 1: Safe Changes (Zero Visual Regression Risk)
*These changes are purely additive or 100% pixel-identical mappings.*
- Add missing token definitions (`--text-2xs`, `--text-compact`, `--shadow-cyan-glow`, `--color-surface-dark`) to `@theme` in `globals.css`.
- Replace exact hardcoded instances of `#101114` with `text-vl-black` / `bg-vl-black` / `text-primary`.
- Replace exact hardcoded instances of `#00D9FF` with `text-vl-cyan` / `bg-vl-cyan` / `text-accent`.
- Replace exact hardcoded instances of `#F3F0E8` with `bg-vl-white` / `text-vl-white`.
- Add `xl` (44px) and `2xl` (48px) size variants to `src/components/ui/button.tsx`.
- Add `lg` (44px) size variant to `src/components/ui/input.tsx`.

### Tier 2: Changes Requiring Visual Review
*These changes resolve subtle inconsistencies and should be previewed in staging.*
- Consolidating the "Seven Shades of Off-White" (`#FAF9F5`, `#FBF9F5`, `#F9F8F6`, `#F0EDE6`) into unified `--color-vl-white` (`#F3F0E8`) and `--color-surface-warm-soft` (`#FAF9F5`).
- Harmonizing the storefront floating header container (`max-w-6xl` / 1152px) with the main content container (`max-w-7xl` / 1280px).
- Adding `Noto Sans Bengali` or `Hind Siliguri` font loading in `RootLayout` to improve Bengali text rendering.

### Tier 3: Changes That Should NOT Be Made (Anti-Patterns)
*These actions would damage the brand identity or break existing functional flows.*
- **DO NOT** replace the custom storefront `ProductCard` with the generic shadcn `Card`. (The product card has a custom 2:3 aspect ratio, zero-radius image canvas, and dual-layer hover crossfade that defines the VibeLock aesthetic).
- **DO NOT** force `rounded-lg` or `rounded-xl` onto storefront checkout or product cards. (The sharp 4px and 0px corners are intentional).
- **DO NOT** alter database schema enums, payment callback handlers, or checkout logic during design system consolidation.

---

## 2. Five-Phase Implementation Roadmap

```
Phase 1: Token Enrichment in globals.css (Additive only)
    ↓
Phase 2: UI Primitives Touch-Target Expansion
    ↓
Phase 3: Automated Codemod for Top 3 Hardcoded HEX Values
    ↓
Phase 4: Bengali Typography & Internationalization Support
    ↓
Phase 5: Design Governance & Linting Enforcement
```

---

### Phase 1: Token Foundation Enrichment (`globals.css`)
- **Scope:** Update `src/app/globals.css` with the recommended `@theme inline` block from Document 10.
- **Verification:** Run `npm run typecheck` and `npm run build`. Since this phase is purely additive, zero existing pages will change appearance.
- **Estimated Duration:** 1 hour.
- **Regression Risk:** Zero.

---

### Phase 2: Primitive Expansion (`Button`, `Input`, `Card`)
- **Scope:** Enhance `src/components/ui/button.tsx`, `input.tsx`, and `card.tsx`:
  - `Button`: Add `size: "xl"` (`h-11 px-5 text-xs`), `size: "2xl"` (`min-h-12 px-6`), and `variant: "streetwear"`.
  - `Input`: Add `size: "lg"` (`h-11 px-3.5 text-sm rounded-xs border-[#101114]/20 bg-white`).
  - `Card`: Add `variant: "sharp"` (`rounded-xs border border-border bg-background`).
- **Verification:** Run Vitest unit tests for UI components (`npm run test:unit`). Existing button and input callers remain unchanged because `default` variants are preserved.
- **Estimated Duration:** 2 hours.
- **Regression Risk:** Minimal.

---

### Phase 3: Systematic Codemod for Top 3 Brand Colors
- **Scope:** Perform targeted token replacements across `src/components/`:
  - Replace `text-[#101114]` → `text-vl-black` (or `text-primary`)
  - Replace `bg-[#101114]` → `bg-vl-black` (or `bg-primary`)
  - Replace `text-[#00D9FF]` / `text-[#00d9ff]` → `text-vl-cyan` (or `text-accent`)
  - Replace `bg-[#00D9FF]` / `bg-[#00d9ff]` → `bg-vl-cyan`
  - Replace `text-[10px]` → `text-2xs`
  - Replace `text-[11px]` → `text-compact`
- **Safety Mechanism:** Run replacements directory by directory (e.g. `src/components/storefront/` first, then `src/components/admin/`).
- **Verification:** Run `git diff`, `npm run typecheck`, and run Playwright / visual checks on the affected views.
- **Estimated Duration:** 3–4 hours.
- **Regression Risk:** Low (Values are 100% identical; replaces hex with token utility).

---

### Phase 4: Bengali Typography & Language Support
- **Scope:** Update `src/app/layout.tsx` to load `Noto_Sans_Bengali` or `Hind_Siliguri` from `next/font/google` and append to the font stack.
- **Verification:** Test order details and checkout page using Bengali customer addresses (e.g. "মিরপুর-১০, ঢাকা, বাংলাদেশ") across Chrome, Safari, and Firefox to verify baseline alignment and font rendering.
- **Estimated Duration:** 1–2 hours.
- **Regression Risk:** Low.

---

### Phase 5: Design Governance & ESLint Rules
- **Scope:** Add an ESLint rule (or `eslint-plugin-tailwindcss`) configured to flag arbitrary HEX colors in `src/components/`.
- **Purpose:** Prevent new hardcoded HEX codes from creeping back into the codebase during future feature sprints.
- **Estimated Duration:** 1 hour.
- **Regression Risk:** Zero.

---

## 3. Risk Mitigation & Verification Matrix

| Potential Risk | Root Cause | Preventive Action | Rollback Strategy |
|---|---|---|---|
| **Visual Distortion in Table Heights** | Modifying default `h-8` in `Button` or `Input` | Never alter the default variant; add new variants (`size="lg"`) instead | Instant git checkout of `button.tsx` |
| **Dark Mode Background Inversion** | Changing global `:root` vs `.dark` mapping | Keep `:root` background `#f2f2f2` and `.dark` `#101114` | Revert `globals.css` |
| **Checkout Flow Interruption** | Accidental change to button type or form action | Perform AST codemod on class names only; do not touch JSX tag properties | Full staging test before production merge |
| **Font Shifting / Layout Jump (CLS)** | Loading web font without `display: "swap"` | Configure `display: "swap"` and matching fallback metrics | Remove font declaration from layout |

---

## 4. Governance & Long-Term System Health

Once VibeLock Design System v1.0 is established:
1. **Component First:** New features must build on `<Button>`, `<Input>`, `<Card>`, and `<Badge>`.
2. **Token Exclusivity:** Arbitrary bracket values like `text-[#101114]` and `text-[11px]` are disallowed in new code.
3. **Documentation:** Keep `docs/design-system-audit/` updated as the living architecture specification for VibeLock.

