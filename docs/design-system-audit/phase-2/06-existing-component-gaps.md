# Phase 2 — 06: Component Gaps, Missing Primitives & Custom Preservation

> **Scope:** Identification of missing UI primitives, missing component variants/sizes, and documentation of components that must remain custom.  
> **Status:** READ-ONLY Proposal

---

## 1. Missing Base Primitives in `src/components/ui/`

The audit revealed that developers frequently bypassed the central library simply because the necessary primitive **did not exist**:

| Missing Component | Why It Is Needed | Current Ad-Hoc Solution | Proposed New Primitive |
|---|---|---|---|
| **Textarea** | Order delivery notes, customer reviews, contact inquiries, staff internal notes | 28 raw `<textarea>` tags with inconsistent borders and focus states | `src/components/ui/textarea.tsx` |
| **Native Select** | High-density 64-district delivery selection on mobile iOS / Android viewports | 45 raw `<select>` tags with manual chevron SVG positioning | `src/components/ui/select-native.tsx` |
| **Selectable Option Card** | Checkout shipping method selection, COD vs SSLCOMMERZ payment options | Repetitive manual flex label wrappers in `checkout-form.tsx` | `src/components/shared/selectable-card.tsx` |
| **Stat / KPI Card** | Admin overview metrics, inventory velocity indicators | Repetitive inline cards in `admin/page.tsx` and `inventory/page.tsx` | Promote `AdminKpiCard` to `src/components/ui/stat-card.tsx` |

---

## 2. Missing Component Variants & Sizes Summary

```
Button:
  ├── Missing Sizes:
  │   ├── xl     (44px — Mobile touch target standard)
  │   └── 2xl    (48px — Primary e-commerce checkout CTA)
  └── Missing Variants:
      ├── streetwear          (Obsidian black + heavy uppercase + cyan glow)
      └── streetwear-outline  (High-contrast 2px border streetwear action)

Input:
  ├── Missing Sizes:
  │   └── lg     (44px — Primary mobile form input)
  └── Missing Variants:
      ├── brand  (White background, subtle dark border, cyan focus ring)
      └── dark   (Dark surface #16171B, warm white text, cyan focus ring)

Card:
  └── Missing Variants:
      ├── brand  (Storefront restrained 4px radius with subtle border)
      ├── panel  (Customer account 8px panel with soft shadow)
      └── dark   (Auth & modal dark surface #16171B)

Badge:
  ├── Missing Shapes:
  │   └── tag    (Rectangular 4px streetwear tag for SALE, NEW, and SKUs)
  └── Missing Semantic Variants:
      ├── sale    (Red background #E50010)
      ├── success (Emerald background #10B981)
      └── warning (Amber background #F59E0B)
```

---

## 3. Components That MUST Remain Custom (Do Not Generalize)

Certain components carry irreplaceable brand DNA or specialized domain logic and **must not be replaced by generic primitives**:

### 1. `ProductCard` ([`src/components/storefront/catalog/product-card.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/storefront/catalog/product-card.tsx))
- **Why it must remain custom:**  
  Features an architectural 2:3 vertical aspect ratio, zero-radius image canvas, dual-image crossfade hover effect, and an optimistic client-side wishlist toggle synchronized via `useSyncExternalStore`. Replacing this with a generic card would destroy VibeLock's visual identity.

### 2. `VibeLockLoader` & `VibeLockLoaderDark` ([`src/components/shared/VibeLockLoader.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/shared/VibeLockLoader.tsx))
- **Why it must remain custom:**  
  A custom cyberpunk/streetwear telemetry screen with simulated Dhaka CDN connection stages and live latency fluctuations. It is a signature brand asset.

### 3. `OrderConfirmationTracker` ([`src/components/storefront/orders/order-confirmation-tracker.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/storefront/orders/order-confirmation-tracker.tsx))
- **Why it must remain custom:**  
  Specialized customer-facing post-purchase order lifecycle visualizer with dedicated status checkpoints for courier dispatch in Bangladesh.

### 4. `PaymentGatewayBadge` ([`src/components/shared/payment-gateway-badge.tsx`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/shared/payment-gateway-badge.tsx))
- **Why it must remain custom:**  
  Contains Bangladesh-specific payment gateway recognition logic (SSLCOMMERZ, bKash, Nagad, Cash on Delivery) and custom icons.

### 5. `PosView` & POS System ([`src/components/pos/`](file:///e:/All%20Project/POS-System/vibelock-web/src/components/pos/))
- **Why it must remain custom:**  
  Built for offline-ready physical retail barcode scanning, thermal slip rendering, and split cash/card tender flows.

