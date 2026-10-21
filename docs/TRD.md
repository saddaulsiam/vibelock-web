# VibeLock Website --- Technical Requirements Document (TRD)

## 1. Technology baseline

- Next.js 16.3.8 App Router
- React 19, TypeScript
- Tailwind CSS v4 and shadcn/ui
- PostgreSQL
- Prisma 5.22.0
- Auth.js / NextAuth v5 beta
- Server Actions and route handlers
- Zustand where client-side state is appropriate
- Vitest, ESLint, TypeScript compiler
- Node.js / npm

Confirm actual versions from `package.json` before any upgrade; this
document records the current known baseline.

## 2. Application boundaries

- Public storefront routes serve published catalog data only.
- Protected customer routes require a valid authenticated user.
- Admin routes/actions require server-side ADMIN authorization.
- Payment provider code stays behind the payment service/provider
  boundary.
- Courier provider code stays behind `ShippingProvider` and
  `ShippingService`.
- Inventory changes are ledger-based through `InventoryTransaction`;
  do not directly decrement a product stock field.
- Financial and inventory operations use database transactions and row
  locks where required.

## 3. Key route groups

### Public

- `/`
- `/products`
- `/category/[slug]`
- `/products/[slug]`
- `/cart`
- `/login` and registration flow as implemented
- `/order-success/[orderNumber]`

### Customer

- `/account`
- `/account/orders`
- `/account/orders/[orderNumber]`
- `/account/orders/[orderNumber]/return`
- `/account/profile`
- `/account/addresses`
- `/account/addresses/[id]/edit`
- `/account/returns`
- `/account/returns/[id]`
- `/account/security`

### Admin

- `/admin/categories` and category create/edit
- `/admin/products` and product create/edit
- `/admin/orders`, `/admin/orders/[id]`
- `/admin/returns`, `/admin/returns/[id]`
- `/admin/customers`, `/admin/customers/[id]`
- `/admin/inventory`, `/admin/inventory/[variantId]`
- `/admin/coupons` and create/edit
- `/admin/shipping`, zones, methods, shipment detail
- `/admin/reports`
- `/api/admin/reports/export`
- Payment callback route under `/api/payments/sslcommerz/callback`

## 4. Critical invariants

- Do not trust client-provided prices, totals, payment status, user
  ID, or stock.
- Recalculate prices and totals on the server from authoritative
  database records.
- Payment SUCCESS requires server-side gateway validation and matching
  merchant reference, amount, and BDT currency.
- A repeated verified callback must not duplicate inventory commitment
  or financial effects.
- Order creation and reservation must be atomic.
- Available stock = current stock − active reservations.
- Current stock = sum of inventory transaction quantities.
- Manual adjustment must not reduce stock below active reserved
  quantity.
- Order transitions must follow the centralized transition rules.
- Return/refund operations must validate eligibility, quantities,
  amounts, ownership/role, and duplicate processing.
- Rejected operations should not create success history/audit records.
- Provider outages or missing credentials must fail safely without
  fabricating success.

## 5. Test and quality requirements

For a focused change: 1. Inspect current implementation and git diff. 2.
Make the smallest safe change. 3. Run relevant Vitest integration tests. 4. Run `npx tsc --noEmit`. 5. Run relevant lint checks. 6. Run
`git diff --check`. 7. Report changed files, schema/migration impact,
commands/results, warnings, and remaining risks.

Do not run destructive database commands or reset migrations. Do not
commit unless explicitly requested.
