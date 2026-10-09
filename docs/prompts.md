# VibeLock --- Copilot / Coding Prompts

## General project rule

Use this at the start of implementation tasks:

> Inspect the existing code, schema, tests, and git diff first. Work
> within the current Next.js/TypeScript/Prisma architecture. Make the
> smallest production-safe change. Preserve unrelated working changes.
> Do not reset/drop/truncate databases, rewrite migrations, commit,
> upgrade dependencies, or change Prisma schema unless explicitly
> required and justified. Keep secrets out of output. Run targeted
> Vitest tests, `npx tsc --noEmit`, relevant lint, and
> `git diff --check`. Report changed files, schema/migration status,
> exact checks/results, warnings, and remaining risks.

## 1. Verify successful SSLCOMMERZ order

> Verify order `VL-20261008-A06967` across the actual local database and
> application UI. Do not initiate a new payment. Check the Order,
> Payment, InventoryReservation, InventoryTransaction, cart, customer
> order history, admin order details, and reports. Confirm payment is
> verified server-side and status values reconcile. Check whether the
> reservation is committed exactly once and no duplicate SALE/stock
> effect occurred. Do not print credentials, full payment secrets, or
> sensitive customer data. Make no code/schema changes unless a concrete
> defect is proven. If read-only database inspection is unavailable,
> state that clearly rather than guessing.

## 2. Security audit

> Perform a code-only production security audit. Inspect every API
> route, Server Action, authentication/session boundary,
> authorization/ownership check, input validation, rate limit, upload,
> payment callback, shipping action, CSV export, security header, and
> secret-handling path. Prioritize critical/high findings and provide
> file/line evidence. Do not make speculative changes. Fix only verified
> issues with minimal changes, add focused tests, and report unresolved
> risks. Never expose secret values.

## 3. POS integration design

> Audit the existing Electron + React + TypeScript POS project and
> VibeLock website architecture. Do not modify code or schema yet.
> Propose a shared-backend design where online and POS sales use the
> same authoritative PostgreSQL inventory ledger and order services.
> Identify authentication roles, order channel, tender/payment model,
> receipt, void/return, cash-session reconciliation, concurrency,
> offline behavior, API contracts, migrations, and reporting changes.
> Clearly separate existing features from proposed features. Return
> phased implementation and acceptance tests.

## 4. Payment idempotency test

> Inspect current SSLCOMMERZ callback/payment service and tests. Add or
> run focused tests for duplicate verified callbacks, invalid amount,
> currency mismatch, missing transaction ID, merchant-reference
> mismatch, and failed/unverified callback. Ensure no duplicate
> inventory commitment or financial side effects. Do not call a live
> gateway. Do not change production credentials.

## 5. Inventory concurrency

> Inspect reservation and inventory adjustment services. Test concurrent
> checkouts for the same variant, reservation rollback on failed order
> creation, cancellation release, payment commit idempotency, and return
> restock idempotency. Keep all inventory mutations ledger-based. No
> direct stock field decrement and no destructive DB operations.

## 6. Release checklist

> Produce a release checklist based on actual repository and environment
> configuration. Distinguish code PASS, local environment PASS, sandbox
> PASS, and production PASS. Do not label production ready merely
> because build/tests or sandbox payment pass. Include
> secrets/configuration, migrations, HTTPS, Redis/rate limiting,
> backup/restore, monitoring, payment, courier, security headers, and
> rollback plan.
