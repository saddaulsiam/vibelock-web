# Phase 2D: SelectableCard Extraction & Migration Plan
## Controlled Rollout & Regression Safeguards

**Status:** IMPLEMENTATION PLAN (READ-ONLY)  
**Date:** 2026-11-07  
**Prerequisites:** Phase 2C approved, Pre-Implementation Review approved

---

## 1. Extraction Scope

The extraction will move duplicated inline radio-card styling into `src/components/shared/selectable-card.tsx`.

### Files to Create:
1. `src/components/shared/selectable-card.tsx` (Reusable UI Primitive)

### Files to Modify Upon Approval:
1. `src/components/storefront/checkout/checkout-form.tsx`
   - Replace lines 657–691 (shipping selection options) with `<SelectableCard>`
   - Replace lines 838–874 (payment selection options) with `<SelectableCard>`

---

## 2. Behavior Preservation Checklist

| Aspect | Current Implementation | Extracted Component Guarantee |
|---|---|---|
| **Payment Selection State** | `paymentMethod` (React `useState<string>`) | Preserved verbatim: `checked={paymentMethod === m.value}`, `onChange={() => setPaymentMethod(m.value)}` |
| **Shipping Selection State** | `selectedShippingMethodId` (React `useState<string \| null>`) | Preserved verbatim: `checked={selectedShippingMethodId === m.id}`, `onChange={() => setSelectedShippingMethodId(m.id)}` |
| **Validation Error Clearing** | In shipping `onChange`, `errors.shippingCity` is cleared if present | Retained completely in consumer's `onChange` callback |
| **Form Serialization** | Uses native radio `name="paymentMethod"` and `name="shippingMethodSelection"` | Extracted card forwards `name` and `value` to native `<input type="radio">` |
| **Disabled/Empty State** | Handled before card map (e.g. `paymentOptions.length === 0` alert) | Unchanged in parent component |
| **Single Shipping Option** | Non-selectable status card rendered when `shippingMethods.length === 1` | Left untouched (it is not a selectable option) |

---

## 3. Risk Assessment & Mitigation

| Potential Risk | Severity | Mitigation Strategy |
|---|---|---|
| **Focus / Tab Key Misbehavior** | Low | Native `<input type="radio">` is preserved without custom key listeners; `focus-within` styles enhance visual clarity |
| **State Desynchronization** | Medium | The component is completely stateless; state ownership remains in `CheckoutForm` |
| **Visual Regression (Pixel mismatch)** | Low | Exactly identical classes (`rounded-xs`, `border`, `bg-[#F3F0E8]/70`, `shadow-xs`) used via design tokens |
| **Form Submission Interruption** | Low | Radios keep exact `name` and `value` properties used during native and programmatic form submission |

---

## 4. Required Verification & Regression Tests

Upon approval and implementation of Phase 2D, execute:

```bash
# 1. Typecheck
npm run typecheck

# 2. Lint
npm run lint

# 3. Unit & Integration Tests (including full checkout test suite)
npm run test:unit
npx vitest run tests/integration/checkout*.test.ts tests/integration/shipping*.test.ts

# 4. Production Build
npx next build
```

---

## 5. Approval Gate

**STOP.**  
This concludes the READ-ONLY pre-implementation audit for Phase 2D. No application code has been modified.  
Await explicit user approval before creating `src/components/shared/selectable-card.tsx` or modifying `checkout-form.tsx`.

