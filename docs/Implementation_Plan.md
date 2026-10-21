# VibeLock --- Implementation Plan

## Current baseline

Core storefront, admin operations, customer account, inventory
ledger/reservations, returns/refunds, reporting, production hardening,
SSLCOMMERZ integration, and Steadfast provider boundary are implemented.
A successful SSLCOMMERZ sandbox payment was reported by the user. This
does not prove production readiness.

## Workstream A --- Verify successful payment

- Find the exact order from the user-reported success page.
- Verify payment record and order payment status in database/admin UI.
- Verify reservation state and SALE/stock accounting behavior matches
  the existing payment design.
- Confirm cart clearing and customer/admin order visibility.
- Confirm reports include the order correctly.
- Repeat callback/reload only through safe test procedure and confirm
  no duplicate inventory/financial effect.
- Do not expose credentials or use destructive database commands.

**Exit criteria:** all order/payment/inventory/customer/admin/report
values reconcile.

## Workstream B --- Security and launch QA

- Review all API routes and Server Actions for authentication,
  authorization, input validation, ownership, and rate limiting.
- Verify production cookie/session behavior on HTTPS.
- Verify security headers, CSP strategy, CSRF protections where
  applicable, upload validation, and safe error messages.
- Check logs for accidental secrets/PII.
- Confirm dependency and build status.
- Test backup and restore procedure.

**Exit criteria:** no unresolved critical/high findings; documented
accepted residual risks.

## Workstream C --- Steadfast

- Configure valid VibeLock courier credentials in a secure
  environment.
- Verify base URL and environment/provider selection.
- Run a controlled eligible shipment test.
- Confirm consignment/tracking persistence and status refresh mapping.
- Verify timestamps and order/shipment synchronization.
- Keep mock provider blocked for production shipment creation.
- Do not invent or rely on undocumented webhook payloads.

**Exit criteria:** one controlled shipment created and refreshed
successfully, or a documented blocker from provider/account setup.

## Workstream D --- Production deployment

- Provision production PostgreSQL and apply reviewed migrations.
- Set strong `AUTH_SECRET` (at least 32 characters), HTTPS
  `NEXT_PUBLIC_APP_URL`, payment production credentials, mail/storage
  credentials as required, Redis for rate limiting, and courier
  settings.
- Ensure secrets are supplied through host secret management, not
  committed files.
- Configure domain/DNS/TLS, logging, monitoring, uptime alerts, and
  database backups.
- Deploy a known build and run smoke tests.

**Exit criteria:** production environment checks pass and
rollback/backup path is known.

## Workstream E --- POS integration (future)

- Audit existing Electron/React/TypeScript POS project and its
  API/database boundaries.
- Decide whether POS calls VibeLock APIs or whether a shared backend
  module is extracted; avoid two independent stock authorities.
- Define authentication roles, store/cashier permissions, order
  channel, tender records, receipt flow, void/return behavior, and
  cash reconciliation.
- Add schema fields only after design review.
- Implement transaction-safe POS sale using the same inventory ledger
  and reservation rules.
- Add channel-aware reports and concurrent-sale tests.

**Exit criteria:** online and in-store sales reconcile to one inventory
source and auditable order/payment records.

## Change protocol

For each task: inspect first; minimal change; preserve existing work; no
schema/dependency changes unless necessary and approved; run focused
tests, `npx tsc --noEmit`, relevant lint, and `git diff --check`; report
files changed, schema status, verification, and blockers. No commit
unless explicitly requested.
