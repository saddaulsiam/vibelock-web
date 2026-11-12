# VibeLock Global Badge Usage Guide

> **Status:** Active & Canonical  
> **Source Component:** [`src/components/ui/badge.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/ui/badge.tsx)  
> **Framework:** Next.js App Router, Tailwind CSS v4, Base UI Primitives (`@base-ui/react`), CVA  
> **Aesthetic Direction:** Elevated Brutalist Streetwear (Nike SNKRS, Kith, Supreme, Shopify Plus)

---

## 1. Overview & Philosophy

The `<Badge />` component is VibeLock's technical micro-indicator. It delivers high-density, high-contrast status and contextual signals across Storefront, POS terminal, Customer Account, and Admin operations without ever breaking layout.

### Key Capabilities:

1. **17 Curated Variants:** Spanning brand identity, streetwear retail drops, e-commerce orders, and operational states.
2. **Real-Time Status Dots & Radar Ping:** Solid (`dot={true}`) or animated pulsing (`dot="pulse"`) for live inventory, tracking, and flash drops.
3. **Streetwear Geometry Control:** Sleek modern DTC pill (`shape="pill"`), brutalist square (`shape="square"`), or unrounded sharp (`shape="sharp"`).
4. **Interactive Dismissible Tags:** Built-in accessible remove button for active filter chips and search tags.
5. **Zero Font Wrap & WCAG Compliance:** Engineered with `whitespace-nowrap select-none` and high-contrast color tokens.

---

## 2. Component API Reference

```tsx
import { Badge } from "@/components/ui/badge";
```

### Props

| Prop          | Type                                      |    Default     | Description                                                                    |
| :------------ | :---------------------------------------- | :------------: | :----------------------------------------------------------------------------- |
| `variant`     | `string`                                  |  `"default"`   | Visual style and semantic color scheme (see catalog below).                    |
| `size`        | `"sm"` \| `"default"` \| `"lg"` \| `"xl"` |  `"default"`   | Target height and padding scale (18px, 20px, 24px, 28px).                      |
| `shape`       | `"pill"` \| `"square"` \| `"sharp"`       |    `"pill"`    | Corner rounding geometry (`rounded-full`, `rounded-brand`, or `rounded-none`). |
| `dot`         | `boolean` \| `"pulse"`                    |  `undefined`   | Renders a color-matched status dot. `"pulse"` adds an animated radar ping.     |
| `icon`        | `React.ReactNode`                         |  `undefined`   | Optional leading icon slot (automatically sized with `size-3`).                |
| `removable`   | `boolean`                                 |    `false`     | Renders an accessible dismiss button with an `X` icon.                         |
| `onRemove`    | `(e) => void`                             |  `undefined`   | Callback fired when the dismiss button is clicked.                             |
| `removeLabel` | `string`                                  | `"Remove tag"` | Accessible aria-label for screen readers.                                      |
| `className`   | `string`                                  |  `undefined`   | Additional Tailwind utility overrides.                                         |

---

## 3. Complete Variant Catalog

### A. VibeLock Brand & High-Energy Streetwear

| Variant     | Visual Appearance                                      | Primary Use Case                                       | Example Code                                         |
| :---------- | :----------------------------------------------------- | :----------------------------------------------------- | :--------------------------------------------------- |
| **`cyan`**  | Electric cyan background, dark text, cyan border       | Verified authentic, in-stock, primary cyber accent     | `<Badge variant="cyan">AUTHENTIC</Badge>`            |
| **`brand`** | Obsidian charcoal background, pure white text          | Official brand mark, header tags, premium labels       | `<Badge variant="brand">VIBELOCK DROP</Badge>`       |
| **`glow`**  | Translucent cyan fill + neon outer cyber glow          | Hyped drops, countdown highlights, hero editions       | `<Badge variant="glow" dot="pulse">LIVE NOW</Badge>` |
| **`dark`**  | Deep obsidian black with subtle technical border       | Technical streetwear tag, dark mode surfaces           | `<Badge variant="dark">HEAVYWEIGHT</Badge>`          |
| **`glass`** | Frosted glassmorphism (`backdrop-blur-md bg-black/55`) | Overlaid directly on lookbooks and product photography | `<Badge variant="glass">LIMITED PIECE</Badge>`       |

### B. High-Impact Retail & Promotions

| Variant        | Visual Appearance                                      | Primary Use Case                                 | Example Code                                                |
| :------------- | :----------------------------------------------------- | :----------------------------------------------- | :---------------------------------------------------------- |
| **`sale`**     | High-contrast status red (`#E50010`), white text, bold | Discount percentage, markdown sale tag           | `<Badge variant="sale" shape="square">-30% OFF</Badge>`     |
| **`new`**      | High-contrast status red, streetwear brutalist box     | Seasonal collection drop, newly launched product | `<Badge variant="new" shape="square">NEW DROP</Badge>`      |
| **`featured`** | Vibrant gold/amber background (`#FBBF24`), dark text   | Editor's pick, staff favorite, trending piece    | `<Badge variant="featured" shape="square">FEATURED</Badge>` |
| **`vip`**      | Amber/gold accent tint with subtle border              | Vault access, loyalty club members, private tier | `<Badge variant="vip" icon={<Crown />}>VAULT VIP</Badge>`   |
| **`drop`**     | Royal purple background, purple border                 | Artist collaboration, capsule collection         | `<Badge variant="drop">COLLAB DROP</Badge>`                 |

### C. Operational & E-Commerce Order Lifecycle

| Variant       | Visual Appearance                                               | Meaning / Typical Status                                 | Example Code                                           |
| :------------ | :-------------------------------------------------------------- | :------------------------------------------------------- | :----------------------------------------------------- |
| **`success`** | Emerald green fill & border (`bg-emerald-100 text-emerald-800`) | Delivered, Order Confirmed, Payment Successful, Active   | `<Badge variant="success" dot>DELIVERED</Badge>`       |
| **`warning`** | Golden amber fill & border (`bg-amber-100 text-amber-800`)      | Pending Payment, Awaiting Verification, Low Stock        | `<Badge variant="warning" dot="pulse">PENDING</Badge>` |
| **`error`**   | Rose red fill & border (`bg-rose-100 text-rose-800`)            | Cancelled, Payment Failed, Return Rejected, Out of Stock | `<Badge variant="error" dot>CANCELLED</Badge>`         |
| **`info`**    | Sky blue fill & border (`bg-blue-100 text-blue-800`)            | Shipped, In-Transit, Out for Delivery, Courier Handover  | `<Badge variant="info" dot="pulse">IN TRANSIT</Badge>` |

### D. Neutral & Secondary Controls

| Variant         | Visual Appearance                         | Primary Use Case                | Example Code                                   |
| :-------------- | :---------------------------------------- | :------------------------------ | :--------------------------------------------- |
| **`default`**   | Primary theme fill                        | Standard neutral tag            | `<Badge variant="default">Category</Badge>`    |
| **`secondary`** | Light grey neutral fill                   | Secondary tags, metadata counts | `<Badge variant="secondary">12 items</Badge>`  |
| **`outline`**   | Transparent background with subtle border | Subtle tags, inactive pills     | `<Badge variant="outline">Winter 2026</Badge>` |
| **`ghost`**     | Transparent background with hover fill    | Minimal toolbar pills           | `<Badge variant="ghost">Filter</Badge>`        |

---

## 4. Size & Dimension Hierarchy

|     Size      |      Height      |     Padding     |           Font Size            | Best For                                                |
| :-----------: | :--------------: | :-------------: | :----------------------------: | :------------------------------------------------------ |
|   **`sm`**    | `18px` (`h-4.5`) | `px-1.5 py-0.5` |       `text-3xs` (`8px`)       | Table cell rows, micro SKU labels, compact POS receipts |
| **`default`** |  `20px` (`h-5`)  |  `px-2 py-0.5`  |      `text-2xs` (`10px`)       | Standard e-commerce cards, order list rows, popovers    |
|   **`lg`**    |  `24px` (`h-6`)  |  `px-2.5 py-1`  |       `text-xs` (`12px`)       | Order details summary, customer dashboard hero pills    |
|   **`xl`**    |  `28px` (`h-7`)  |   `px-3 py-1`   | `text-xs` (`12px`, 800-weight) | Product Detail Page (PDP) hero headline badges          |

---

## 5. Standard E-Commerce Implementation Patterns

### Pattern 1: E-Commerce Order Status (4-Phase Lifecycle)

Use this pattern across Account Dashboard, Order History, and Admin:

```tsx
import { Badge } from "@/components/ui/badge";

export function OrderStatusBadge({ status }: { status: string }) {
  switch (status.toUpperCase()) {
    case "DELIVERED":
    case "SUCCESS":
      return (
        <Badge variant="success" size="lg" dot>
          Delivered
        </Badge>
      );

    case "PENDING":
    case "PAYMENT_PENDING":
      return (
        <Badge variant="warning" size="lg" dot="pulse">
          Awaiting Payment
        </Badge>
      );

    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
    case "IN_TRANSIT":
      return (
        <Badge variant="cyan" size="lg" dot="pulse">
          In Transit
        </Badge>
      );

    case "CANCELLED":
    case "FAILED":
      return (
        <Badge variant="error" size="lg" dot>
          Cancelled
        </Badge>
      );

    default:
      return (
        <Badge variant="secondary" size="lg">
          {status}
        </Badge>
      );
  }
}
```

---

### Pattern 2: Streetwear Product Card Overlays (Sale / New Drops)

Place this inside the relative container of product cards:

```tsx
// Discount Sale Badge (Brutalist Square)
<Badge variant="sale" shape="square" size="sm" className="absolute top-2 left-2 z-10">
  -25%
</Badge>

// Glassmorphism Lookbook Tag
<Badge variant="glass" size="sm" className="absolute bottom-2 left-2 z-10">
  FALL EDITION
</Badge>

// Live Exclusive Drop
<Badge variant="glow" dot="pulse" size="sm" className="absolute top-2 right-2 z-10">
  DROP LIVE
</Badge>
```

---

### Pattern 3: Live Stock & Inventory Indicators

```tsx
// Plenty in stock
<Badge variant="success" dot size="sm">IN STOCK</Badge>

// Low stock urgency signal
<Badge variant="warning" dot="pulse" size="sm">ONLY 2 LEFT</Badge>

// Completely sold out
<Badge variant="error" dot size="sm">SOLD OUT</Badge>
```

---

### Pattern 4: Dismissible Filter Chips (Catalog & Search)

```tsx
<div className="flex flex-wrap gap-2">
  <Badge
    variant="secondary"
    size="lg"
    removable
    onRemove={() => removeFilter("size")}
    removeLabel="Remove size filter"
  >
    Size: XL
  </Badge>

  <Badge
    variant="secondary"
    size="lg"
    removable
    onRemove={() => removeFilter("color")}
    removeLabel="Remove color filter"
  >
    Color: Obsidian Black
  </Badge>
</div>
```

---

## 6. Pro-Rules & Anti-Patterns

### ❌ Anti-Patterns to Avoid:

1. **Never pass manual hex/color classes to `<Badge>`:**  
   _Bad:_ `<Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">`  
   _Good:_ `<Badge variant="success">`
2. **Never allow badge text to wrap:**  
   The component already enforces `whitespace-nowrap`. Do not add `whitespace-normal` or multi-line paragraphs inside a badge.
3. **Avoid icon-only badges without accessible labels:**  
   If rendering an icon badge without visible text, always supply `aria-label`.
4. **Never nest buttons inside children:**  
   When using dismissible tags, pass `onRemove` or `removable` to `<Badge>`. Do not manually inject `<button>` tags into `children`.
