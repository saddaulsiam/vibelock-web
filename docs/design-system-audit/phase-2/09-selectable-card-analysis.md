# Phase 2D: Selectable Card Pre-Implementation Analysis
## Checkout Payment & Shipping Selection Patterns

**Status:** READ-ONLY PRE-IMPLEMENTATION AUDIT  
**Date:** 2026-11-07  
**Target Consumer:** `src/components/storefront/checkout/checkout-form.tsx`

---

## 1. Overview & Context

In `checkout-form.tsx`, two critical selection mechanisms dictate the customer's checkout fulfillment and settlement flow:
1. **Shipping Method Selection** (lines 654–693): Triggered when `shippingMethods.length > 1` (e.g. Dhaka standard vs. express delivery).
2. **Payment Method Selection** (lines 835–876): Radio cards for `COD`, `ONLINE` (SSLCOMMERZ), etc.

Currently, both selections are implemented via inline `<label>` elements enclosing a native `<input type="radio">` along with customized layout hierarchies. While their visual appearance and interaction patterns are almost identical, their exact CSS classes, internal spacing, and child layout topologies differ slightly.

---

## 2. In-Depth Inspection of Existing Implementations

### A. Shipping Method Option Card

* **Source Location:** `src/components/storefront/checkout/checkout-form.tsx` (Lines 657–691)
* **Parent Layout:** Responsive CSS Grid: `grid gap-2.5 sm:grid-cols-2`
* **Container Element:** `<label>` with `cursor-pointer`
* **Condition for Multi-Select:** Rendered only when `shippingMethods.length > 1`. (When `length === 1`, a read-only confirmation pill is rendered instead at lines 696–715).

#### Markup & Styling Analysis:
```tsx
<label
  key={method.id}
  className={`flex cursor-pointer items-start justify-between rounded-xs border p-3.5 transition-all duration-150 ${
    isSelected
      ? "border-[#101114] bg-[#F3F0E8]/70 shadow-xs ring-1 ring-[#101114]"
      : "border-border bg-white hover:border-[#101114]/40"
  }`}
>
  <div className="flex items-start gap-2.5">
    <input
      type="radio"
      name="shippingMethodSelection"
      value={method.id}
      checked={isSelected}
      onChange={() => {
        setSelectedShippingMethodId(method.id);
        if (errors.shippingCity) {
          setErrors((prev) => ({ ...prev, shippingCity: undefined }));
        }
      }}
      className="mt-0.5 size-4 accent-[#101114]"
    />
    <div className="min-w-0">
      <span className="block text-xs font-bold text-[#101114] uppercase">
        {method.name}
      </span>
      <span className="text-muted-foreground block text-[11px]">
        {method.zoneName} · Doorstep
      </span>
    </div>
  </div>
  <span className="shrink-0 text-xs font-black text-[#101114]">
    {formatPrice(method.cost)}
  </span>
</label>
```

#### State & Event Management:
* **Selected state:** `selectedShippingMethodId === method.id`
* **State setter:** `setSelectedShippingMethodId(method.id)`
* **Validation side-effect:** Clears `errors.shippingCity` upon user selection if a field error previously blocked submission.
* **Layout Structure:** Split layout — Left side contains `[Radio, Title, Subtitle]`; Right side contains `[Price Badge]` (`justify-between`).

---

### B. Payment Method Option Card

* **Source Location:** `src/components/storefront/checkout/checkout-form.tsx` (Lines 838–874)
* **Parent Layout:** Vertical stack: `<fieldset className="mt-5 space-y-3">` with `<legend className="sr-only">`
* **Container Element:** `<label>` with `cursor-pointer`

#### Markup & Styling Analysis:
```tsx
<label
  key={method.value}
  className={`flex cursor-pointer items-start gap-3.5 rounded-xs border p-4 transition-all duration-150 ${
    isSelected
      ? "border-[#101114] bg-[#F3F0E8]/60 shadow-xs"
      : "border-border bg-white hover:border-[#101114]/35"
  }`}
>
  <input
    type="radio"
    name="paymentMethod"
    value={method.value}
    checked={isSelected}
    onChange={() => setPaymentMethod(method.value)}
    className="mt-0.5 size-4 accent-[#101114]"
  />
  <div className="min-w-0 flex-1">
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-[#101114]">{method.title}</span>
      {method.value === "COD" && (
        <span className="bg-vl-black/5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#101114] uppercase">
          Popular in BD
        </span>
      )}
      {method.value === "ONLINE" && (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500">
          <CreditCard className="size-3.5" />
          Cards / Mobile Banking (SSLCOMMERZ)
        </span>
      )}
    </div>
    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
      {method.detail}
    </p>
  </div>
</label>
```

#### State & Event Management:
* **Selected state:** `paymentMethod === method.value`
* **State setter:** `setPaymentMethod(method.value)`
* **Validation side-effect:** None direct (managed higher up during form submission).
* **Layout Structure:** Full-width body — Radio on top-left, `flex-1` block with header row (title + badge/icons) and a multi-line detail description below.

---

## 3. Comparison & Variance Matrix

| Feature | Shipping Selection Card | Payment Selection Card | Shared Goal for `SelectableCard` |
|---|---|---|---|
| **HTML Semantic Root** | `<label>` | `<label>` | `<label>` (preserves click-to-check natively) |
| **Input Element** | Native `<input type="radio">` | Native `<input type="radio">` | Native radio preserving keyboard navigation (`ArrowUp`/`ArrowDown`/`Tab`/`Space`) |
| **Accent Color** | `accent-[#101114]` | `accent-[#101114]` | `accent-vl-black` / `accent-[#101114]` |
| **Radius** | `rounded-xs` (4px) | `rounded-xs` (4px) | `rounded-brand` / `rounded-xs` |
| **Padding** | `p-3.5` | `p-4` | Configurable or standardized via `size="default"` (`p-4`) / `size="sm"` (`p-3.5`) |
| **Selected Border** | `border-[#101114]` | `border-[#101114]` | `border-vl-black` |
| **Selected Background** | `bg-[#F3F0E8]/70` | `bg-[#F3F0E8]/60` | `bg-vl-white/65` or centralized token |
| **Selected Ring** | `ring-1 ring-[#101114]` | *(None)* | Configurable `withRing?: boolean` (defaults to false or subtle) |
| **Hover State** | `hover:border-[#101114]/40` | `hover:border-[#101114]/35` | Standardized `hover:border-vl-black/40` |
| **Right Side Content** | Price (`formatPrice(method.cost)`) | Badges / Gateway details | Supported via right slot / flexible `children` |

---

## 4. Key Findings & Behavioral Constraints

1. **State Ownership Must Remain in Consumer:**
   The `SelectableCard` must NOT be a controlled state container that manages selected IDs internally. State and validation logic (such as clearing `errors.shippingCity` on shipping select) belong entirely to `CheckoutForm`.
2. **Native Radio Behavior Must Not Be Mocked:**
   Using native `<input type="radio">` ensures that browser form navigation, screen readers (`role="radio"`, `aria-checked`), and keyboard arrow-key group cycling work out of the box without complex JavaScript keyboard listeners.
3. **No Redesign / Pixel-Identical Fidelity:**
   The extracted component must provide visual parity down to the exact 4px border radius, border color, subtle background tint, and radio alignment.

