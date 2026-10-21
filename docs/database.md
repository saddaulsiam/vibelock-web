# VibeLock --- Database Notes

## Database platform

PostgreSQL accessed through Prisma. The current known migration history
is applied and previously reported `prisma migrate status` was up to
date. Always verify the current environment before deployment.

## Rules

- Treat `prisma/schema.prisma` and migration history as authoritative.
- Never run `prisma migrate reset`, DROP, TRUNCATE, or destructive
  cleanup against a shared/important database.
- Do not edit an already-applied migration to change production
  history.
- Review generated SQL and migration diff before applying schema
  changes.
- Back up production before migrations and verify restore capability.
- Avoid casual schema/dependency changes for tasks that can be solved
  without them.

## Inventory ledger

```text
currentStock = SUM(InventoryTransaction.quantity)
reservedStock = SUM(active InventoryReservation.quantity where status = RESERVED)
availableStock = currentStock - reservedStock
```

Inventory adjustments must write ledger transactions and respect active
reservations. Never use a direct `stock--` mutation.

## Order and payment consistency

- Order creation and reservation are one transaction.
- Payment state must be verified from the provider server-side.
- A verified successful payment should commit the associated
  reservation exactly once.
- Repeated callbacks must not duplicate inventory or payment effects.
- State changes should use guarded transitions and history/audit
  records.
- Keep purchase-time item prices and customer/delivery snapshots
  consistent with the existing schema.

## Returns/refunds

- Validate returnable quantities against prior accepted/processed
  returns.
- Restock once through positive RETURN transactions.
- Validate refund amount and payment relationship.
- Do not claim a provider refund succeeded unless provider
  response/record supports it.

## Migration procedure

1.  Inspect schema, migration status, and current diff.
2.  Confirm whether a schema change is truly needed.
3.  Create a migration with Prisma using the project's established
    process.
4.  Review migration SQL for data loss/locking concerns.
5.  Run focused tests and TypeScript checks.
6.  Apply to a non-production environment first.
7.  Back up production, apply migration, verify status and application
    smoke tests.
8.  Document rollback/recovery strategy; never assume reversing a
    migration is safe.

## Future POS schema review

Potential concepts to evaluate---not currently assumed present: - order
channel/source (ONLINE/POS) - store/location - cashier/operator
identity - tender/payment method records - receipt number - cash
register/session and reconciliation - void/return linkage and audit
trail Do not add these blindly; design constraints and migration plan
first.
