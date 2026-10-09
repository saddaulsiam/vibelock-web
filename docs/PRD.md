# VibeLock Website --- Product Requirements Document (PRD)

**Product:** VibeLock\
**Domain:** `https://vibelock.com.bd`\
**Market:** Bangladesh\
**Product type:** Men's fashion / streetwear e-commerce with
physical-store POS planned for integration\
**Status:** Core website features implemented; production deployment and
final launch verification remain.

## 1. Product vision

Build a reliable, secure, mobile-friendly commerce platform for VibeLock
that supports online sales today and can share orders, inventory, and
reporting with the physical-store POS later.

## 2. Goals

-   Let customers discover products, select variants, add items to cart,
    place COD or online orders, and manage their account.
-   Give authorized staff an operational admin area for catalog, orders,
    inventory, returns, coupons, shipping, customers, and reports.
-   Keep order, payment, and inventory records consistent under retries
    and concurrent requests.
-   Support SSLCOMMERZ for online payments and a provider boundary for
    Steadfast courier integration.
-   Provide a trustworthy foundation for later POS integration and
    channel-aware reporting.

## 3. User groups

-   **Guest:** browse public catalog and product details.
-   **Customer:** checkout, view own orders, manage profile/addresses,
    request eligible returns.
-   **Admin:** manage store operations, catalog, orders, inventory,
    returns/refunds, shipping, coupons, and reports.
-   **Future POS operator:** make in-store sales through an authorized
    POS client connected to the same backend and inventory source of
    truth.

## 4. Core functional scope

### Storefront

-   Homepage, product listing, category pages, product detail,
    search/filter/pagination.
-   Only published products appear publicly.
-   Variant selection, product imagery, cart and totals.
-   SEO metadata and canonical/Open Graph metadata where implemented.

### Checkout and orders

-   Authenticated checkout.
-   COD and SSLCOMMERZ online payment.
-   Atomic order creation, inventory reservation, COD usage handling,
    and cart clearing.
-   Stable checkout idempotency key for the form lifecycle.
-   Clear order-success outcome.

### Customer account

-   Account dashboard and order history/details.
-   Shipment/tracking display where available.
-   Return request and return history.
-   Profile name and address management; email is not editable through
    profile UI.
-   Ownership checks for private order/account records.

### Admin operations

-   Categories and products.
-   Orders, order history, payment reconciliation view.
-   Returns/refunds.
-   Customers.
-   Inventory transaction history and safe adjustments.
-   Coupons.
-   Shipping zones/methods and shipments.
-   Reports, profitability views, charts, and CSV exports.

## 5. Non-functional requirements

-   Type-safe code and validated inputs.
-   Role-based authorization on server-side boundaries.
-   Transactional integrity for money/order/inventory operations.
-   Idempotent handling of payment callbacks and retryable workflows.
-   Safe failure when payment or courier credentials are missing.
-   No secrets in source control, logs, or user-facing errors.
-   Responsive, accessible, clear UI with useful loading/empty/error
    states.
-   Production configuration must be explicitly validated.

## 6. Out of scope / known limitations

-   Production launch is not confirmed by sandbox success.
-   Steadfast live shipment has not been confirmed as completed.
-   Coupon administration exists, but coupon application in customer
    checkout is not currently implemented.
-   Checkout shipping pricing is city-based; shipping zone/method
    administration is not yet the checkout pricing source.
-   Net profit/net margin are unavailable until shipping expense,
    gateway fees, operating expenses, and reliable VAT/refund allocation
    data are modeled.
-   Full POS integration is a future workstream, not assumed complete.

## 7. Success criteria

-   Customer can complete a verified sandbox SSLCOMMERZ payment and see
    the correct order result.
-   Payment retries/callback repeats do not double-consume inventory or
    duplicate financial effects.
-   Unauthorized users cannot access admin operations or other
    customers' data.
-   Order, payment, reservation, inventory, customer order history, and
    reports agree.
-   Production deployment has valid production secrets, HTTPS, database,
    rate limiting, monitoring, and tested backups/restore.

## 8. Release gates

1.  Verify the successful sandbox order across
    database/admin/customer/inventory/reports.
2.  Complete targeted security and launch QA.
3.  Configure production database, strong auth secret, HTTPS URL,
    Redis/rate limiting, email/storage integrations as needed.
4.  Replace sandbox payment credentials with VibeLock's own production
    credentials and validate merchant/callback configuration.
5.  Configure real courier credentials/provider and run a controlled
    shipment test.
6.  Perform production smoke tests and rollback/backup readiness checks.
