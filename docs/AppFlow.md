# VibeLock --- Application Flows

## 1. Customer purchase --- COD

1.  Customer browses published products.
2.  Customer selects a valid variant and adds it to cart.
3.  Cart displays server-consistent product pricing and quantities.
4.  Customer signs in and opens checkout.
5.  Server validates cart, variant availability, delivery information,
    and totals.
6.  Within one database transaction, create the order, reserve
    inventory, consume COD-related usage atomically where applicable,
    and clear the cart.
7.  If any transactional step fails, roll back the
    order/reservation/cart mutation.
8.  Show the order-success page and make the order available in
    customer/admin views.

## 2. Customer purchase --- SSLCOMMERZ

1.  Customer chooses online payment.
2.  If required gateway configuration is missing, reject before creating
    an order/reservation.
3.  Create order and inventory reservation atomically; create an
    initiated payment record according to the current payment service
    flow.
4.  Create gateway session and redirect to SSLCOMMERZ.
5.  Receive gateway callback.
6.  Validate the transaction server-side using `val_id`; verify merchant
    transaction reference, amount, currency (BDT), and provider
    response.
7.  On verified success, update payment/order payment status and commit
    reservation exactly once.
8.  On invalid/unverified callbacks, do not mark payment successful or
    commit inventory.
9.  Redirect based on the trusted payment/order record, not untrusted
    callback fields.
10. Repeated callback/retry must be idempotent.

## 3. Admin order transition

1.  Authenticate user and enforce ADMIN role on the server.
2.  Lock the relevant order row where needed.
3.  Validate requested transition against centralized transition rules
    and business eligibility.
4.  Apply state changes inside a transaction.
5.  Add OrderHistory and AuditLog entries for successful changes.
6.  Revalidate affected admin/customer paths.
7.  Invalid transitions return a safe error and do not write success
    history/audit records.

## 4. Inventory adjustment

1.  ADMIN opens a variant inventory detail page.
2.  Server calculates current stock from inventory transactions and
    active reservations.
3.  Admin submits an adjustment with a reason.
4.  Validate quantity and lock the variant row.
5.  Ensure resulting stock is not below active reserved quantity.
6.  Write an ADJUSTMENT inventory transaction; do not directly mutate
    stock.
7.  Revalidate inventory and product availability views.

## 5. Return and refund

1.  Customer requests a return for an eligible delivered order and valid
    item quantities.
2.  Server verifies ownership, delivered state, remaining returnable
    quantity, and policy constraints.
3.  Admin reviews the return.
4.  Process/reject using guarded state transitions.
5.  Restock eligible returned items idempotently using positive RETURN
    inventory transactions.
6.  Refund operations validate the amount and payment records; never
    fabricate a gateway refund.
7.  Persist history/audit data and revalidate views.

## 6. Shipment

1.  Admin selects an eligible order.
2.  Server checks order state, payment/COD eligibility, and
    duplicate/cancelled shipment conditions.
3.  Create a local pending shipment intent.
4.  Call the configured `ShippingProvider`.
5.  Persist returned consignment/tracking identifiers and mapped status.
6.  Sync order/shipment timestamps consistently.
7.  If provider credentials are missing or mock provider is configured
    in production, fail safely.
8.  Use authenticated status refresh for Steadfast until a verified
    official webhook contract is available.

## 7. Future POS flow

1.  POS operator signs in with a specific role and store/location
    permissions.
2.  POS fetches products, variant prices, and available stock from the
    shared VibeLock backend.
3.  Operator scans/selects products and records tender type.
4.  Backend validates price/discount, stock, cashier permission, and
    payment/tender record.
5.  In one transaction, create a POS-channel order, record
    payment/tender, and write SALE inventory transactions.
6.  Print receipt and sync the order into shared admin/reporting views.
7.  POS returns, voids, and cash reconciliation need explicit audit and
    authorization rules.
8.  Do not create a second independent stock ledger or allow offline
    sales to silently overwrite server stock.
