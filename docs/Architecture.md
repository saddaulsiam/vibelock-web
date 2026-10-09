# VibeLock --- Architecture

## 1. High-level architecture

``` text
Customer Browser
   ├── Storefront pages
   ├── Customer account
   └── Checkout
          │
          ▼
Next.js App Router Application
   ├── Server Components / data queries
   ├── Server Actions
   ├── Route Handlers
   ├── Auth.js session + role checks
   ├── Domain services
   │     ├── Order service / transitions
   │     ├── Inventory service
   │     ├── Payment service → SSLCOMMERZ provider
   │     ├── Shipping service → Mock / Steadfast provider
   │     ├── Return/refund service
   │     └── Reporting queries
   ▼
Prisma ORM
   ▼
PostgreSQL
```

## 2. Architectural principles

-   Server-side authorization is mandatory; hiding UI is not
    authorization.
-   Provider integrations are isolated behind service/provider
    boundaries.
-   PostgreSQL is the authoritative persistence layer.
-   Inventory is ledger-based; reservations are separate from committed
    stock movements.
-   Order/payment transitions are explicit and validated.
-   Important state changes are transactional and audited.
-   Provider callbacks are untrusted until independently verified.
-   Public pages expose published catalog data only.
-   Fail closed for sensitive operations when required configuration is
    missing.

## 3. Inventory accounting

-   Current stock is derived from the sum of inventory transaction
    quantities.
-   Reserved stock is derived from active RESERVED reservations.
-   Available stock is current stock minus reserved stock.
-   Order creation and reservation are atomic.
-   Payment success commits a reservation idempotently.
-   Cancellation releases only eligible reservations; it must not
    blindly alter stock.
-   Returns/restocks write positive RETURN transactions and must be
    idempotent.

## 4. Payment architecture

Checkout → order/reservation transaction → initiated payment →
SSLCOMMERZ session → callback → server-side validation → verified
payment state → reservation commitment. Never trust a browser query
string as proof of payment success. Verify merchant reference, amount,
currency, and provider response. Duplicate callbacks must not duplicate
effects.

## 5. Shipping architecture

`ShippingService → ShippingProvider → MockCourierProvider | SteadfastCourierProvider`.
Production shipment creation must reject the mock provider. Steadfast
uses the documented create-order/status endpoints and status mapping in
the implementation. Until an official webhook contract is verified, use
authenticated status refresh rather than inventing webhook semantics.

## 6. Reporting architecture

Reports derive values from persisted orders, order items, payment/refund
records, inventory ledger, and available shipping fields. Cancelled
orders are excluded according to the current report implementation.
Gross profit is not net profit. Do not fabricate shipping expense,
gateway fee, operating expense, VAT, or product-level refund allocation
if the data is not modeled reliably.

## 7. Future POS

Preferred target:

``` text
Online Store ─┐
              ├── VibeLock backend/services ── PostgreSQL
Physical POS ─┘
```

The POS should use the same authoritative inventory and order services.
A separate POS database with independently maintained stock is
discouraged. Define channel/source, cashier/store, tender, receipt,
void/return, and cash-session requirements before schema changes.
