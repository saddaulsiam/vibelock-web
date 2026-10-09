# VibeLock --- Security Guide

## Current known controls

-   Server-side role checks for ADMIN operations.
-   Customer ownership checks for private order/account data.
-   Centralized order transitions.
-   Payment callback server-side validation and
    amount/currency/reference checks.
-   Payment callback idempotency protections.
-   Transactional order creation and inventory reservation.
-   Row locks for sensitive order/inventory operations.
-   AuditLog and OrderHistory for important mutations.
-   Safe rejection when online payment is unconfigured.
-   Production shipment creation rejects mock courier provider.
-   CSV formula injection protection.
-   Production environment validation for strong `AUTH_SECRET` and HTTPS
    app URL.

These are known implementation controls, not a guarantee that every
endpoint is secure.

## Required production checks

### Authentication and authorization

-   Check every route handler, Server Action, and query for
    authentication and correct role.
-   Enforce ownership in the database query/action---not only in the UI.
-   Verify session cookies on HTTPS: Secure, HttpOnly, and appropriate
    SameSite settings.
-   Test login, registration, password/security actions, session expiry,
    and logout.
-   Confirm secrets are strong and unique per environment.

### Input and output

-   Validate all untrusted input with server-side schemas.
-   Enforce bounds on quantities, prices, pagination, strings, uploaded
    files, and CSV exports.
-   Never trust client price, role, user ID, payment status, inventory,
    or redirect targets.
-   Escape/render untrusted text safely and prevent XSS.
-   Avoid detailed stack traces and provider internals in public errors.

### Payments

-   Validate SSLCOMMERZ transaction server-side using the official
    validation endpoint.
-   Verify merchant reference, amount, currency, and success response.
-   Do not treat `?payment=success` as proof.
-   Ensure invalid callbacks do not mutate payment/order/reservation.
-   Test duplicate callbacks and out-of-order callbacks.
-   Keep sandbox credentials out of production; use VibeLock's own
    production merchant configuration.

### Inventory and orders

-   Use database transactions and row locks where necessary.
-   Preserve reservation/ledger invariants.
-   Validate transitions, cancellation eligibility, return quantities,
    and refund amounts.
-   Make retries idempotent.
-   Record audit history for sensitive operations.

### Rate limiting and abuse

-   Configure production Redis/rate limiting for authentication and
    sensitive endpoints.
-   Verify fail-closed behavior when required rate-limiter
    infrastructure is unavailable.
-   Add appropriate limits for expensive public endpoints and checkout
    attempts.

### Browser / HTTP

-   Review CSP and `frame-ancestors`, HSTS, `X-Content-Type-Options`,
    `Referrer-Policy`, and `Permissions-Policy`.
-   Enable HSTS only with correct HTTPS/domain deployment readiness.
-   Ensure redirect URLs are validated.
-   Review CSRF protections for cookie-authenticated mutations.

### Secrets and operations

-   Store secrets in deployment secret management, not source control.
-   Rotate credentials that were exposed or reused outside their
    intended project.
-   Redact secrets, tokens, and unnecessary PII from logs.
-   Restrict database access and use TLS where supported.
-   Enable automated backups and test restoration.
-   Maintain dependency updates, monitoring, alerting, incident
    response, and rollback plans.

## Release severity policy

-   **Critical/High:** block launch until fixed or formally mitigated.
-   **Medium:** fix before launch where practical; otherwise document
    owner and mitigation.
-   **Low:** track and schedule.
-   Record evidence, endpoint, impact, remediation, test, and residual
    risk for each finding.

## Status language

Use "tested locally", "sandbox verified", and "production verified"
precisely. A sandbox payment does not prove production credentials,
merchant registration, deployment configuration, or full production
security.
