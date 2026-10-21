# VibeLock --- Error Handling Standards

## Principles

- Fail safely for money, identity, order, and inventory operations.
- Return useful, non-sensitive messages to users.
- Keep diagnostic details in server logs with correlation IDs where
  available.
- Never expose secrets, tokens, stack traces, SQL details, provider
  credentials, or unnecessary PII.
- Do not convert an unknown provider outcome into success.
- Preserve user input where safe and prevent duplicate submissions.

## Error categories

- **Validation:** field-level message; no mutation.
- **Authentication:** redirect to login or return appropriate
  unauthorized response.
- **Authorization:** deny operation without leaking protected record
  existence.
- **Not found:** show not-found state or safe generic response.
- **Conflict/state transition:** explain that the action is no longer
  available; refresh current state.
- **Rate limit:** ask user to wait and retry; do not reveal internal
  thresholds.
- **Database/transaction:** roll back all related changes and return a
  safe retry message.
- **Payment provider:** distinguish rejected/unverified from
  pending/unknown; never claim payment success without verification.
- **Courier provider:** retain a recoverable local state and avoid
  duplicate shipment creation on retry.
- **Unexpected internal error:** show generic message, log diagnostic
  context, and provide a support/reference ID if implemented.

## Payment-specific handling

- Missing credentials: reject online checkout safely before creating
  order/reservation.
- Gateway session creation failure: do not falsely show a successful
  payment.
- Callback missing `val_id` or invalid validation: do not mark payment
  successful or commit reservation.
- Amount/reference/currency mismatch: reject and record safe
  diagnostic evidence.
- Provider timeout/unknown response: do not assume failure or success
  until reconciled; avoid blind duplicate payment initiation.
- Duplicate callback: idempotent response with no duplicate financial
  or inventory effect.
- Browser redirect/query parameters are presentation hints only, not
  authoritative state.

## Inventory and order handling

- If reservation fails, order creation transaction must roll back and
  cart remain intact.
- If an order transition is invalid, no state/history/audit success
  write should occur.
- Cancellation must verify eligibility and release only valid
  reservations.
- Adjustment must reject a result below active reserved stock.
- Return quantity over the eligible remainder must be rejected.
- Restock must be idempotent.
- Never make direct stock changes to "repair" an error without a
  reviewed ledger transaction.

## Shipment handling

- Missing Steadfast credentials: fail with an actionable admin-safe
  error.
- Mock provider in production: reject shipment creation.
- Provider timeout after request submission: reconcile provider/local
  state before retry to avoid duplicate consignment.
- Unknown status: map conservatively and require status refresh/manual
  review; do not invent delivery success.
- Until an official webhook contract is verified, rely on
  authenticated status refresh for Steadfast.

## Logging

Log: timestamp, correlation/request ID, operation, relevant internal
record IDs, error category, provider outcome class, and retryability. Do
not log: passwords, API secrets, session cookies, authorization headers,
full payment payloads, or full customer payment details.

## UI states

Every important page/action should support: - loading/in-progress -
success confirmation - empty state - validation error - recoverable
failure with retry guidance - terminal/unavailable state - permission
denied/not found where appropriate

## Developer diagnostics

For a bug report, capture the route/action, environment
(local/sandbox/production), safe error message, server log correlation
ID, expected vs actual state, and whether a database mutation occurred.
Do not paste `.env` values into issues or chat.
