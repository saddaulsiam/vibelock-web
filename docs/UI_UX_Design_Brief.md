# VibeLock --- UI/UX Design Brief

## Brand

VibeLock is a Bangladesh men's fashion/streetwear brand for modern urban
youth. The experience should feel minimal, confident, premium,
practical, and locally relevant---not generic luxury or
gaming/cyberpunk.

## Visual direction

- Deep charcoal: `#101114`
- Warm off-white: `#F3F0E8`
- Small cyan accent: `#00D9FF` used sparingly
- Strong typography hierarchy and generous but purposeful spacing.
- Product imagery is the primary visual focus.
- Prefer bright, clear product presentation over dark layouts that
  hide product detail.
- Avoid literal padlock/keyhole/chain/shield/crown/wings/lightning,
  mascot/cartoon marks, circle badges, gradients, heavy shadows, 3D
  effects, and decorative fake writing.

## Storefront UX

- Mobile-first responsive layouts.
- Navigation: logo, primary product/category navigation, search,
  account, cart.
- Homepage should quickly explain the brand and expose new/featured
  products and categories.
- Product cards show product name, price, relevant discount, and
  product image without clutter.
- Product detail clearly communicates variant selection, price,
  availability, image gallery, and add-to-cart feedback.
- Filters and pagination must remain usable on mobile.
- Cart must clearly show quantities, price, subtotal, delivery/fees
  where applicable, and total.
- Checkout should minimize friction, show validation near the relevant
  field, and avoid exposing internal errors.
- Success/failure states must be unambiguous; never show "payment
  success" based only on a query parameter.

## Customer account UX

- Clear order status, payment status, shipment/tracking, return
  eligibility, addresses, and profile.
- Explain unavailable actions in plain language.
- Never reveal another customer's records in empty/error states.

## Admin UX

- Dense but readable operational tables with search, filters,
  pagination, and clear status labels.
- Destructive or financially meaningful actions require explicit
  confirmation and clear consequences.
- Show history/audit context for sensitive order, refund, inventory,
  and shipment changes.
- Forms must show field-level errors and preserve safe non-secret
  input after validation failures.
- Reports must distinguish gross sales, discounts, net sales, refunds,
  COGS, gross profit, and unavailable metrics.
- CSV export should communicate the selected period/filter.

## Accessibility and quality

- Keyboard-operable controls, visible focus, semantic labels, adequate
  contrast, accessible dialogs.
- Do not rely on color alone for status.
- Include loading, empty, success, and recoverable error states.
- Prevent duplicate submission during in-flight mutations.
- Use consistent spacing, typography, buttons, form controls, tables,
  and status treatments.
