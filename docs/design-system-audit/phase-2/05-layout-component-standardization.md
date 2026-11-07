# Phase 2 — 05: Layout & Structural Component Standardization

> **Scope:** Analysis and standardization of layout shells, containers, section rhythm, and atmospheric backgrounds across Storefront, Account, Admin, and POS.  
> **Status:** READ-ONLY Proposal

---

## 1. Container Component Standardization

Location: [`src/components/shared/container.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/shared/container.tsx)

### Current Implementation:
```tsx
export function Container({ className, as: Component = "div", ...props }: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
```

### The Architectural Conflict:
`Container` forces `max-w-360` (1440px / 90rem). Meanwhile, the floating header in `header.tsx` is hardcoded to `max-w-6xl` (1152px), creating a 144px alignment overhang on desktop displays.

### Proposed Component Enhancement:
Add a `size` prop to [`Container`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/shared/container.tsx):

```tsx
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  size?: "default" | "narrow" | "catalog" | "wide";
}

export function Container({
  className,
  as: Component = "div",
  size = "default",
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        size === "default" && "max-w-360",       // 1440px — Preserved default!
        size === "narrow" && "max-w-6xl",        // 1152px — Matches header & account
        size === "catalog" && "max-w-7xl",       // 1280px — Standard storefront feed
        size === "wide" && "max-w-[100rem]",     // 1600px — Operations data tables
        className
      )}
      {...props}
    />
  );
}
```

---

## 2. Section Component Standardization

Location: [`src/components/shared/section.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/shared/section.tsx)

### Current Implementation:
```tsx
export function Section({ className, as: Component = "section", ...props }: SectionProps) {
  const hasCustomPadding = className && /\b(py-|pt-)/.test(className);
  return (
    <Component className={cn(!hasCustomPadding && "py-6 sm:py-8 lg:py-12", className)} {...props} />
  );
}
```

### Assessment:
**Excellent architecture.** The vertical padding progression (`py-6` mobile, `py-8` tablet, `py-12` desktop) creates a balanced, predictable cadence.  
**Action:** Preserve without structural changes. Encourage all storefront sections to consume `<Section>` rather than declaring ad-hoc `py-*` values.

---

## 3. SectionHeading Component Token Migration

Location: [`src/components/shared/section-heading.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/shared/section-heading.tsx)

### The Defect:
Lines 82 and 114 use an **inline style** for the eyebrow text:
```tsx
// Current:
<p className="mb-1.5 text-[10px] font-extrabold tracking-[0.24em] uppercase sm:mb-2 sm:text-[11px]"
   style={{ color: "#00D9FF" }}>
  {eyebrow}
</p>
<h2 className="font-heading text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-3xl md:text-4xl">
  {title}
</h2>
```

### Proposed Standardization:
Replace inline styles and arbitrary hex codes with Phase 1 tokens:
```tsx
// Standardized:
<p className="mb-1.5 text-2xs font-extrabold tracking-streetwear text-vl-cyan uppercase sm:mb-2 sm:text-compact">
  {eyebrow}
</p>
<h2 className="font-heading text-2xl font-black tracking-tight text-vl-black uppercase sm:text-3xl md:text-4xl">
  {title}
</h2>
```
- **Visual Result:** Pixel-for-pixel identical.
- **System Benefit:** Eliminates inline CSS and connects the shared heading directly to the theme.

---

## 4. Atmospheric Procedural Texture Backgrounds

The application features three distinct background textures that must be preserved as standard surface utility patterns:

| Texture Name | Where Used | CSS Implementation | Purpose |
|---|---|---|---|
| **Dark Coordinate Grid** | Storefront Footer, Auth Hero | `linear-gradient(to right, rgba(0, 217, 255, 0.05) 1px, transparent 1px) 36px 36px` | Cyberpunk / technical streetwear aesthetic |
| **Architectural Dot Matrix** | Customer Account Shell | `radial-gradient(rgba(16, 17, 20, 0.13) 1.2px, transparent 1.2px) 30px 30px` | Crisp engineering layout feel |
| **Atmospheric Radial Glow** | Hero sections, Footer backdrop | `radial-gradient(ellipse at center, rgba(0, 217, 255, 0.08), transparent 70%)` | Subtle depth and brand atmosphere |

### Standardization:
Encapsulate these into reusable Tailwind utility classes in `src/app/globals.css`:
- `.bg-grid-cyber`
- `.bg-grid-dots`
- `.bg-radial-glow`

