# Production Order Cleanup Scheduler (`cron-order-cleanup.yml`)

## 1. Overview & Purpose

Online checkout orders that remain in `PENDING` payment status without completion hold inventory reservations and applied coupons. To prevent stock starvation and coupon hoarding, VibeLock provides an automated cleanup endpoint:

- **Endpoint:** `POST https://vibelock.bd/api/cron/orders/cleanup`
- **Scheduler File:** `.github/workflows/cron-order-cleanup.yml`
- **Schedule:** Every 15 minutes (`*/15 * * * *`)
- **Execution Engine:** GitHub Actions (`ubuntu-latest`)

The scheduler invokes the production endpoint securely via HTTPS. The endpoint's internal business logic atomically evaluates abandoned orders, locks records using PostgreSQL `FOR UPDATE` pessimistic row locking, marks expired orders as `CANCELLED`, releases inventory reservations, and restores coupons.

---

## 2. Authentication & Security Contract

### Required Secret: `CRON_SECRET`

The endpoint enforces timing-safe constant-time authentication against `process.env.CRON_SECRET`.

To configure this in GitHub Actions:

1. Navigate to **GitHub Repository** $\rightarrow$ **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Under **Repository secrets**, click **New repository secret**.
3. Set:
   - **Name:** `CRON_SECRET`
   - **Secret:** _(Must match the `CRON_SECRET` environment variable configured in Vercel Production)_

### Security Guarantees

- **Transport Security:** Only HTTPS traffic to `https://vibelock.bd` is permitted.
- **Header:** `Authorization: Bearer ${{ secrets.CRON_SECRET }}` (checked via `crypto.timingSafeEqual`).
- **Zero Log Exposure:** The secret is passed via runner environment variables and masked. The authorization header is never echoed.
- **PII & Data Protection:** Neither raw customer data, order IDs, phone numbers, nor tokens are output to the workflow logs. Only aggregate numeric metrics (`scanned`, `expired`, `skipped`) and HTTP response codes are surfaced.

---

## 3. Reliability & Operational Behavior

### Concurrency Control

```yaml
concurrency:
  group: cron-order-cleanup
  cancel-in-progress: false
```

- **Single Active Execution:** Only one workflow run in the `cron-order-cleanup` concurrency group executes at any given time. In-flight cleanups are never canceled (`cancel-in-progress: false`), preventing database transaction aborts or mid-batch race conditions.
- **Pending Run Replacement (Non-FIFO):** GitHub Actions concurrency does **not** guarantee FIFO queuing of every pending run. If multiple triggers occur while a run is in progress, GitHub Actions retains at most one pending run in the queue; a newer pending run replaces an older pending run.
- **Stateless Catch-up Guarantee:** This behavior is completely safe for order expiration. Because the endpoint evaluates `WHERE "expiresAt" < NOW()` under PostgreSQL `FOR UPDATE` pessimistic row locks, the cleanup operation is fully cumulative and stateless. If a pending run was replaced by a newer trigger during a backlog or high runner contention, the subsequent run evaluates and cleans up all accumulated expired orders across the database, guaranteeing full catch-up without dropped work or orphaned stock reservations.

### Timeouts & Transient HTTP Retries

- **Job Timeout:** `timeout-minutes: 5` ensures hung workflows fail fast.
- **Connection Timeout:** `--connect-timeout 10` (10 seconds to establish TCP/TLS connection).
- **Execution Max Time:** `--max-time 30` (30 seconds maximum total duration per request).
- **Transient HTTP Retries:** `--fail-with-body --retry 3 --retry-delay 5 --retry-connrefused` ensures curl treats HTTP 4xx and 5xx responses as errors, making transient HTTP status codes (408, 429, 500, 502, 503, 504) eligible for automatic retries up to 3 times with a 5-second backoff, while saving the response payload locally for safe inspection.
- **Harden Metrics Logging:** Aggregate counts (`scanned`, `expired`, `skipped`) are extracted only if they are valid JSON numbers. The workflow strictly validates values against integer digits before logging; non-numeric values fall back to `N/A`, and raw responses or arbitrary strings are never echoed.

### Failure Visibility

- Any non-2xx HTTP response (401, 500, 502, 503) or exhausted retries exits with code `1`, causing GitHub Actions to mark the job run as **Failed** (`::error::`).
- Missing `CRON_SECRET` immediately terminates the job with an explicit runner error: `::error::Required secret 'CRON_SECRET' is not configured or is empty in GitHub Actions secrets.`
- If the endpoint encounters an internal error, the endpoint itself logs a Sentry operational alert (`CRON_EXECUTION_FAILED`), and GitHub Actions records the HTTP 500 failure.

### Expected Behavior if Endpoint is Unavailable

- If the VibeLock production endpoint is undergoing a cold start, redeploy, or temporary network partition, `curl` retries 3 times over 15 seconds.
- If the endpoint remains unreachable, the job fails cleanly and logs the curl exit code and HTTP status.
- Order expiration logic uses `WHERE "expiresAt" < NOW()` with `FOR UPDATE` row locks; temporary delays or missed runs are completely safe because the next scheduled 15-minute run will immediately catch up and process all accumulated expired orders.

---

## 4. Operational Runbook

### How to Run Manually (`workflow_dispatch`)

1. Go to the repository **Actions** tab on GitHub.
2. Select **Production Order Cleanup Scheduler** from the left sidebar.
3. Click **Run workflow**, optionally provide a reason (e.g. _"Manual verification after catalog drop"_), and click **Run workflow**.

### How to Inspect Failed Runs

1. Navigate to **Actions** $\rightarrow$ **Production Order Cleanup Scheduler**.
2. Click on the failed run (marked with a red cross).
3. Expand the **Trigger Order Expiration Cleanup** step.
4. Review the logged **HTTP Response Status** and timestamp:
   - `HTTP 401`: `CRON_SECRET` mismatch or missing header.
   - `HTTP 500`: Database timeout or internal error (check Sentry for `CRON_EXECUTION_FAILED`).
   - `curl exit code 28`: Network or connection timeout.
   - `curl exit code 7`: Failed to connect to host.

### How to Disable the Scheduler Safely

If maintenance is required or order expiration needs to be paused temporarily:

1. In the GitHub Actions tab, select **Production Order Cleanup Scheduler**.
2. Click the **...** (three dots) menu at the top right of the workflow overview.
3. Select **Disable workflow**.
4. To re-enable, return to the same menu and click **Enable workflow**.
   _(Alternatively, comment out the `schedule:` block in `.github/workflows/cron-order-cleanup.yml` via a pull request)._
