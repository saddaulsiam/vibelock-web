# VibeLock --- Backend Schema / Domain Model

> This is a domain-level map, not a replacement for
> `prisma/schema.prisma`. Inspect the actual schema before implementing
> changes.

## Core entities

- **User**: authentication identity, profile, role/status as currently
  modeled.
- **Address**: customer delivery/contact addresses and default
  selection.
- **Category**: hierarchical product categories; parent-child
  relationships require circular-parent protection.
- **Product**: catalog identity, slug, publication status,
  descriptions/media and category association.
- **ProductVariant**: sellable variant, SKU/options, price and
  relation to product.
- **Cart / CartItem**: customer cart and selected variants/quantities.
- **Order**: order number, customer/delivery snapshot, status, payment
  status, totals, timestamps.
- **OrderItem**: immutable-at-purchase product/variant/price/quantity
  snapshot.
- **OrderHistory**: state/action history for an order.
- **Payment**: provider, merchant reference, amount, currency, status,
  gateway references and verification-related fields.
- **InventoryTransaction**: signed quantity ledger (SALE, RETURN,
  RESTOCK, DAMAGE, ADJUSTMENT, and existing types).
- **InventoryReservation**: reserved quantities and lifecycle status
  such as RESERVED, COMMITTED, RELEASED.
- **Return / ReturnItem**: return request, item quantities, status,
  review/processing metadata.
- **Refund**: refund amount/provider/reference/status as currently
  modeled.
- **Coupon**: code, discount type/value, minimum order, usage
  limit/count, active window.
- **ShippingZone / ShippingMethod**: admin-configurable shipping data.
- **Shipment**: provider, consignment/tracking identifiers, shipment
  status and lifecycle timestamps.
- **AuditLog**: security/operational record of important mutations.

## Relationships and constraints

- Order belongs to a customer where account-backed; order must also
  preserve necessary purchase-time customer/address details.
- Order has order items, payment record(s) according to current
  schema, history, and optional shipment/return/refund relations.
- Product has variants; inventory is tracked per sellable variant.
- Reservations reference order/variant and must be idempotently
  committed/released.
- Return items reference original order items and must not exceed
  eligible unreturned quantity.
- Coupon code uniqueness and usage constraints must be enforced
  server-side.
- Provider identifiers and merchant references should be
  indexed/unique where appropriate according to the actual schema.

## Inventory formulas

- `currentStock = SUM(InventoryTransaction.quantity)`
- `reservedStock = SUM(quantity for active RESERVED reservations)`
- `availableStock = currentStock - reservedStock`

## Order transition policy currently known

- PENDING → CONFIRMED \| PROCESSING \| CANCELLED
- CONFIRMED → PROCESSING \| CANCELLED
- PROCESSING → SHIPPED \| CANCELLED
- SHIPPED → DELIVERED
- RETURN_REQUESTED → RETURN_PROCESSING
- RETURN_PROCESSING → RETURNED
- RETURNED → REFUNDED
- DELIVERED, CANCELLED, REFUNDED are terminal in the centralized
  transition model.

## POS extension proposal --- not yet implemented

Before POS integration, evaluate whether to add a validated
channel/source field (for example ONLINE/POS), store/location identity,
cashier identity, tender/payment method details, receipt number, and
cash-session/reconciliation entities. Use a migration only after schema
review and explicit implementation approval. Do not assume these fields
already exist.
