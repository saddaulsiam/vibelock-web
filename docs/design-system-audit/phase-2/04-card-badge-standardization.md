# Phase 2 — 04: Card & Badge Component Standardization

> **Scope:** Analysis of container panels, cards, tags, and badges; variant architecture to eliminate custom ad-hoc containers.  
> **Status:** READ-ONLY Proposal

---

## 1. Card & Panel Standardization

Location: [`src/components/ui/card.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/ui/card.tsx)

### The Existing Problem
The base-nova `Card` primitive is locked to:
```tsx
"group/card bg-card text-card-foreground ring-foreground/10 rounded-xl ring-1"
```
Because of `rounded-xl` and `ring-1`, developers building storefront, cart, checkout, and account pages avoided `<Card>` and hand-rolled custom `div` containers over 150 times.

---

## 2. The 4 Container Card Patterns in VibeLock

| Pattern | Where Used | Current Classes | Proposed Card Variant |
|---|---|---|---|
| **A. Storefront Drop Card** | Checkout sections, Cart summary, Order success slip | `border-border bg-background rounded-xs border p-5 sm:p-6 shadow-xs` | `<Card variant="brand">` |
| **B. Customer Account Panel** | Profile card, Membership card, Address cards | `border-[#101114]/10 bg-white rounded-lg border p-6 shadow-2xs` | `<Card variant="panel">` |
| **C. Operations KPI Card** | Admin overview metrics, Inventory KPI | `border-[#101114]/10 bg-white rounded-xl border p-5 ring-1 ring-black/5` | `<Card variant="default">` (Preserved!) |
| **D. Dark Operations Panel** | Auth panels, Modal dialogs, POS cart drawer | `border-border-dark bg-[#16171B] rounded-lg border p-6 text-vl-white` | `<Card variant="dark">` |

---

## 3. Recommended Card Component Enhancement

Add a `variant` prop to [`src/components/ui/card.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/ui/card.tsx):

```tsx
interface CardProps extends React.ComponentProps<"div"> {
  size?: "default" | "sm";
  variant?: "default" | "brand" | "panel" | "dark";
}

export function Card({ className, size = "default", variant = "default", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col overflow-hidden text-sm transition-all",
        // Existing default preserved 100%:
        variant === "default" && "bg-card text-card-foreground ring-foreground/10 rounded-xl ring-1 py-(--card-spacing)",
        // New storefront brutalist variant:
        variant === "brand" && "bg-background text-foreground border border-border rounded-brand p-5 sm:p-6 shadow-xs",
        // New customer account panel variant:
        variant === "panel" && "bg-white text-foreground border border-border-warm rounded-ui p-6 shadow-2xs",
        // New dark surface variant:
        variant === "dark" && "bg-surface-dark text-vl-white border border-border-dark rounded-ui p-6 shadow-md",
        className
      )}
      {...props}
    />
  );
}
```

---

## 4. Badge & Status Tag Standardization

VibeLock currently has **3 competing badge implementations**:

```
1. src/components/ui/badge.tsx                → Base-UI Pill Badge (rounded-4xl)
2. src/components/storefront/catalog/product-badge.tsx → Streetwear Sale Tag (rounded-xs)
3. src/components/shared/payment-gateway-badge.tsx     → Gateway Badge (SSLCOMMERZ, bKash)
```

### 4.1 Comparative Analysis:
| Feature | `ui/badge.tsx` | `ProductBadge` | `PaymentGatewayBadge` |
|---|---|---|---|
| **Corner Radius** | `rounded-4xl` (Pill: 9999px) | `rounded-xs` (Brand: 4px) | `rounded-xs` (Brand: 4px) |
| **Typography** | `text-xs font-medium` | `text-[10px] font-bold uppercase tracking-wider` | `text-[10px] font-semibold` |
| **Height** | `h-5` (20px) | `py-0.5` (~18px) | `py-0.5` (~18px) |
| **Token Reference** | Central CSS variables | Hardcoded `#E50010`, `#101114` | Tailwind classes (`bg-blue-50`, etc.) |

---

## 5. Recommended Badge Architecture

Rather than maintaining separate custom tags, enhance [`src/components/ui/badge.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/ui/badge.tsx) with a `shape` prop:

```tsx
// Inside badgeVariants:
variants: {
  variant: {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive/10 text-destructive",
    outline: "border-border text-foreground",
    cyan: "bg-vl-cyan/15 text-[#00a3c4] dark:text-vl-cyan border border-vl-cyan/30 font-bold",
    brand: "bg-vl-black text-vl-white border border-vl-border font-bold",
    sale: "bg-status-sale text-white font-bold",      // Maps to Phase 1 --color-status-sale
    success: "bg-status-success/15 text-emerald-800 border border-status-success/30 font-bold",
    warning: "bg-status-warning/15 text-amber-900 border border-status-warning/30 font-bold",
  },
  shape: {
    pill: "rounded-pill", // Default
    tag: "rounded-brand text-2xs tracking-wider uppercase font-bold", // Streetwear tag
  }
}
```

### Result:
- `ProductBadge` can simply wrap `<Badge variant="sale" shape="tag">` while preserving its exact current look and replacing `#E50010` with `--color-status-sale`.
- `PaymentGatewayBadge` continues to provide rich payment metadata with icons while consuming central tokens.

