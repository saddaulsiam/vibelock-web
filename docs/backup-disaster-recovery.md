# VibeLock — Backup Architecture & Disaster Recovery Runbook

**Document Status:** ACTIVE IMPLEMENTATION (Manual Backup + Staging Restore Verified; Workflow Schedule Disabled; Cloudflare Lifecycle Rules Pending Dashboard Verification; Neon PITR Limits Plan-Dependent)
**Target System:** VibeLock E-Commerce Platform (`saddaulsiam/vibelock-web`)
**Repository Branch:** `main`
**Storage Destination:** Cloudflare R2 (`vibelock-db-backups`)
**Automation Workflow:** `.github/workflows/backup-neon-to-r2.yml`
**Last Updated:** November 18, 2026

---

## 1. Executive Summary & Infrastructure Baseline

### 1.1 Infrastructure Context

| Component                  | Production Configuration                                              | Operational Role & Constraints                                                                                                                                                                                                                       |
| :------------------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database Engine**        | PostgreSQL 18.7 on Neon Serverless                                    | Cloud-native serverless architecture with compute-storage separation.                                                                                                                                                                                |
| **Cloud Region**           | AWS Singapore (`ap-southeast-1`)                                      | Database compute and storage endpoints located in Singapore.                                                                                                                                                                                         |
| **Database Plan**          | **Neon Free Plan ($0/month)**                                         | Shared compute, subject to inactivity scale-to-zero.                                                                                                                                                                                                 |
| **Neon PITR / Branching**  | **Plan-Dependent (Requires Neon Dashboard Verification)**             | Continuous WAL history retention and point-in-time restore capability depend on the active Neon tier and project history settings. Do not assume a fixed retention limit without dashboard verification.                                             |
| **Connections**            | Pooled (`DATABASE_URL`, port 5432) & Direct (`DIRECT_URL`, port 5432) | `DATABASE_URL` connects via PgBouncer (used by Vercel serverless runtime for pooled app queries); `DIRECT_URL` connects unpooled directly to compute (used for Prisma migrations and GitHub Actions `pg_dump` backups).                              |
| **Hosting Platform**       | Vercel (Edge & Serverless Node.js runtime)                            | Next.js App Router connected via environment secrets.                                                                                                                                                                                                |
| **ORM / Data Access**      | Prisma ORM                                                            | Schema in `prisma/schema.prisma`; migrations via `prisma migrate deploy`.                                                                                                                                                                            |
| **Offsite Backup Storage** | **Cloudflare R2 (`vibelock-db-backups`)**                             | Private S3-compatible object storage located in APAC region.                                                                                                                                                                                         |
| **Backup Trigger**         | GitHub Actions (`backup-neon-to-r2.yml`)                              | **MANUAL ONLY (`workflow_dispatch`) during initial rollout.** Daily automated scheduling (`03:00 UTC` / `09:00 Asia/Dhaka`) is intentionally disabled and will be enabled via follow-up PR after successful backup and staging restore verification. |
| **Encryption Tool**        | `age` (Actually Good Encryption)                                      | Client-side public-key encryption before upload; private key preserved offline.                                                                                                                                                                      |
| **Media Storage**          | Cloudinary                                                            | Product images, customer return evidence, and avatars stored offsite.                                                                                                                                                                                |

> [!IMPORTANT]
> **Production Safety Rule:** Under no circumstances should production data, production database branches, or production connection strings be modified or targeted during disaster recovery drills. All restore drills and verification routines must run against isolated recovery branches or separate staging databases.

---

## 2. Offsite Backup Architecture Design

### 2.1 Architecture Overview

The automated backup architecture implements a zero-trust, offsite storage strategy:

$$\text{Neon PostgreSQL (DIRECT\_URL)} \xrightarrow[\text{SSL Unpooled}]{\text{pg\_dump -Fc}} \text{Plaintext Dump} \xrightarrow[\text{Recipient Key}]{\text{age encryption}} \text{Encrypted Dump} \xrightarrow[\text{S3 API}]{\text{Upload}} \text{Cloudflare R2} \xrightarrow[\text{Verify}]{\text{Download \& Hash}} \text{SHA-256 Match}$$

```mermaid
flowchart TD
    subgraph Neon["Neon Infrastructure (AWS ap-southeast-1)"]
        Compute["Neon Compute Endpoint\n(DIRECT_URL, SSL required)"]
        Storage["Neon Storage Engine\n(WAL History & Branching)"]
        Compute <--> Storage
    end

    subgraph GHA["GitHub Actions Runner (ubuntu-latest)"]
        Trigger["Trigger:\nMANUAL ONLY (workflow_dispatch)\nSchedule enabled post-verification"]
        Dump["pg_dump -Fc (Max Compression)\nSecure Temp Dir (chmod 700)"]
        Encrypt["age Public-Key Encryption\n(BACKUP_AGE_RECIPIENT)"]
        Purge["Immediate Plaintext Deletion"]
        Checksum["Local SHA-256 Checksum\n(*.dump.age.sha256)"]
        Upload["AWS CLI Upload\n(R2 S3-Compatible API)"]
        VerifyRemote["Remote Existence Check\n(aws s3 ls)"]
        DownloadVerify["Remote Artifact Download\n(aws s3 cp to verify)"]
        CompareChecksum["Integrity Verification\n(Remote Hash == Local Hash)"]

        Trigger --> Dump --> Encrypt --> Purge --> Checksum --> Upload --> VerifyRemote --> DownloadVerify --> CompareChecksum
    end

    subgraph R2["Cloudflare R2 (vibelock-db-backups, APAC)"]
        DumpObj["postgres/vibelock-YYYY-MM-DD-HHmmss.dump.age"]
        HashObj["postgres/vibelock-YYYY-MM-DD-HHmmss.dump.age.sha256"]
        Lifecycle["Lifecycle Rule:\nAuto-Delete after 7 Days\nAbort Multipart after 7 Days"]
        DumpObj --- Lifecycle
        HashObj --- Lifecycle
    end

    Compute -->|"TLS Stream (DIRECT_URL)"| Dump
    Upload -->|"Encrypted Artifact"| DumpObj
    Upload -->|"Hash File"| HashObj
    DumpObj -->|"Download for Round-Trip Check"| DownloadVerify
```

> [!NOTE]
> **Round-Trip Integrity Verification:** Integrity verification is not limited to `aws s3 ls`. Immediately following the upload of the encrypted dump and checksum to Cloudflare R2, the workflow downloads the remote `.dump.age` artifact, calculates its SHA-256 checksum independently, and validates that it matches the original local checksum before concluding successfully.

---

### 2.2 Cloudflare R2 Configuration (Verified Baseline)

The offsite backup bucket has been provisioned under the owner's Cloudflare account:

| Setting              | Value                                                                                 | Security / Operational Purpose                                                                                        |
| :------------------- | :------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| **Bucket Name**      | `vibelock-db-backups`                                                                 | Dedicated storage container for VibeLock database backups.                                                            |
| **Storage Class**    | Standard                                                                              | High durability, low latency access for restore drills.                                                               |
| **Location Hint**    | APAC                                                                                  | Proximity to VibeLock Singapore database infrastructure.                                                              |
| **Public URL**       | **Disabled**                                                                          | Bucket is completely private; no public web access.                                                                   |
| **Custom Domains**   | **None**                                                                              | No external domain routing; accessed strictly via S3 credentials.                                                     |
| **Lifecycle Rule 1** | **Delete objects after 7 days (Intended — Pending Verification)**                     | Intended specification to automatically prune dumps older than 7 days; requires verification in Cloudflare Dashboard. |
| **Lifecycle Rule 2** | **Abort incomplete multipart uploads after 7 days (Intended — Pending Verification)** | Intended specification to automatically clean up partial uploads; requires verification in Cloudflare Dashboard.      |
| **API Token**        | `vibelock-backup-automation`                                                          | Scoped token with **Object Read & Write** permissions restricted strictly to `vibelock-db-backups`.                   |

---

### 2.3 Financial & Free-Tier Sustainability

- **Target Monthly Cost:** **$0.00** within Cloudflare R2 and GitHub Actions free-tier limits.
- **R2 Free Tier Allowances:**
  - **Storage:** 10 GB-months free storage.
  - **Class A Operations (Writes):** 1,000,000 requests/month free.
  - **Class B Operations (Reads):** 10,000,000 requests/month free.
  - **Egress:** **$0.00 / GB (Always Free)**.
- **VibeLock Projected Footprint:**
  - A compressed daily database dump is estimated between 5 MB and 50 MB.
  - Under the intended 7-day retention policy (once verified and active in Cloudflare R2), the steady-state storage footprint is approximately **35 MB to 350 MB**, consuming less than 4% of the 10 GB free allowance.
- **Disclaimer:** Zero cost cannot be legally guaranteed if storage volume, operation count, or runner minutes exceed applicable provider free-tier limits.

---

### 2.4 Coverage and Exclusions Boundary

| System Asset                              | Covered by Automated Backup? | Recovery Strategy / Responsible Layer                                                                                                                                                                                                                                                                                                                                           |
| :---------------------------------------- | :--------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PostgreSQL Schema & Tables**            |           **YES**            | Restored via `pg_restore` from `.dump.age` artifact into target PostgreSQL instance.                                                                                                                                                                                                                                                                                            |
| **Relational Data & Records**             |           **YES**            | Restored via `pg_restore` (Users, Orders, Payments, Inventory, Audit Logs).                                                                                                                                                                                                                                                                                                     |
| **PostgreSQL Cluster Roles & Privileges** |            **NO**            | `pg_dump` targets database `neondb`. Global cluster roles, database creation DDL, and server-level permissions must be maintained via infrastructure setup.                                                                                                                                                                                                                     |
| **Cloudinary Media Assets**               |            **NO**            | **Critical Distinction:** The database stores only image metadata and CDN URLs (`ProductImage.url`, `User.image`, `Banner.imageUrl`, `ReturnRequest` attachments). If Cloudinary assets are deleted, database restoration will point to missing 404 URLs. Cloudinary requires independent backup (e.g., Cloudinary automatic backup to an S3/R2 bucket or periodic asset sync). |
| **Application Source Code**               |            **NO**            | Maintained under Git version control in GitHub (`saddaulsiam/vibelock-web`). Immutable commit history.                                                                                                                                                                                                                                                                          |
| **Vercel Runtime Configuration**          |            **NO**            | Deployment builds, edge routing, and environment variables stored in Vercel project settings.                                                                                                                                                                                                                                                                                   |
| **Environment Secrets & API Keys**        |            **NO**            | Secret keys (`AUTH_SECRET`, `SSLCOMMERZ_*`, `CLOUDINARY_*`, `RESEND_API_KEY`) must be backed up securely in an encrypted team vault (e.g., 1Password or Bitwarden).                                                                                                                                                                                                             |
| **Payment Gateway Configuration**         |            **NO**            | SSLCOMMERZ store ID, secret keys, IPN webhooks, and merchant credentials reside in provider portals.                                                                                                                                                                                                                                                                            |
| **Courier / Shipping Configuration**      |            **NO**            | Pathao, Steadfast, and Paperfly API credentials and webhook registrations reside in courier partner portals.                                                                                                                                                                                                                                                                    |

---

## 3. GitHub Actions Secrets Configuration

To enable the automated backup workflow, the repository owner must configure five secrets in GitHub:

**Navigation:** `GitHub Repository` $\rightarrow$ `Settings` $\rightarrow$ `Secrets and variables` $\rightarrow$ `Actions` $\rightarrow$ `New repository secret`

> [!IMPORTANT]
> **Connection String Distinction (`DIRECT_URL` vs. `DATABASE_URL`):**
>
> - **`DATABASE_URL` (Pooled):** Used exclusively by the Vercel application runtime and Prisma Client (`ep-...-pooler...`). Routes through PgBouncer for transaction connection pooling. PgBouncer does not support long-lived transactional snapshot locks required by `pg_dump`.
> - **`DIRECT_URL` (Unpooled):** Direct unpooled connection string to the Neon compute endpoint (port 5432 with `sslmode=require`). The backup workflow specifically reads **`secrets.DIRECT_URL`** for `pg_dump`. Do not set `secrets.DATABASE_URL` for backup automation.

| Secret Name                | Value Description                                                                                                                                                                                                              | Example / Format                                                                                        |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **`DIRECT_URL`**           | Neon direct PostgreSQL connection string (direct unpooled compute endpoint, port 5432 with `sslmode=require`). Bypasses PgBouncer pooler for reliable `pg_dump` streaming locks. Configured in GitHub Secrets as `DIRECT_URL`. | `postgres://user:password@ep-cool-butterfly-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| **`R2_ACCESS_KEY_ID`**     | Cloudflare R2 token Access Key ID from the `vibelock-backup-automation` token.                                                                                                                                                 | `a1b2c3d4e5f67890abcdef1234567890` (32 characters)                                                      |
| **`R2_SECRET_ACCESS_KEY`** | Cloudflare R2 token Secret Access Key from the `vibelock-backup-automation` token.                                                                                                                                             | `0123456789abcdef...` (64-character hex string)                                                         |
| **`R2_ACCOUNT_ID`**        | Cloudflare Account ID (located in the right sidebar of the Cloudflare R2 overview dashboard).                                                                                                                                  | `abc123def45678901234567890abcdef` (32 characters)                                                      |
| **`BACKUP_AGE_RECIPIENT`** | Public `age` recipient key generated locally by the owner.                                                                                                                                                                     | `age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p`                                        |

> [!CAUTION]
> **Private Key Safety:** Never add the private identity key (`AGE-SECRET-KEY-1...`) to GitHub Secrets, repository files, or chat prompts. The private key is required only for decryption during emergency restoration and must be stored offline.

---

## 4. Key Management: Generating & Preserving the `age` Key Pair

VibeLock uses [`age`](https://github.com/FiloSottile/age) for client-side encryption. Public-key cryptography ensures the backup runner can encrypt dumps using only the public recipient key, making it mathematically impossible for a runner compromise to expose or decrypt prior backups.

### 4.1 Generating the Key Pair Locally (Owner Only)

1. **Install `age` on your local machine:**
   - **macOS:** `brew install age`
   - **Linux:** `sudo apt-get install age`
   - **Windows:** `winget install FiloSottile.age` or `choco install age.portable`
2. **Generate the key pair:**
   ```bash
   age-keygen -o vibelock-backup-identity.txt
   ```
3. **Inspect the generated file:**
   ```text
   # created: 2026-11-17T05:30:00Z
   # public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
   AGE-SECRET-KEY-1...<KEEP_THIS_LINE_OFFLINE_NEVER_COMMIT>
   ```
   - **Public Key (`age1...`):** Copy this value and configure it as the `BACKUP_AGE_RECIPIENT` GitHub Secret.
   - **Secret Key (`AGE-SECRET-KEY-1...`):** Your private master key.

### 4.2 Safe Preservation of the Private Key

- **Primary Storage:** Save the `vibelock-backup-identity.txt` file in an encrypted password manager (1Password, Bitwarden, KeePass) in a secure "VibeLock Infrastructure" vault.
- **Physical Cold Storage:** Print or handwrite the `AGE-SECRET-KEY-1...` string on an emergency recovery sheet and store it in a physical fireproof safe.
- **Digital Cold Storage:** Copy to an encrypted offline USB drive stored in a secure location.
- **Destruction of Plaintext Temp Files:** Once stored safely, securely delete the plaintext file from your local working directory:
  ```bash
  # Linux/macOS
  shred -u vibelock-backup-identity.txt 2>/dev/null || rm -f vibelock-backup-identity.txt
  ```

---

## 5. Operational Runbook: Verification, Decryption & Staging Restore

### 5.1 Triggering a Manual Backup

During the initial rollout phase, the workflow trigger is **MANUAL ONLY (`workflow_dispatch`)**. The daily automated schedule (`03:00 UTC` / `09:00 Asia/Dhaka`) remains disabled after the successful November 17, 2026 restore drill. Do not enable it automatically as part of this runbook update; obtain a separate owner decision.

To trigger an immediate backup:

- **Via GitHub Web Interface:**
  1. Navigate to the repository on GitHub.
  2. Click the **Actions** tab.
  3. In the left sidebar, click **Neon PostgreSQL to Cloudflare R2 Automated Backup**.
  4. Click **Run workflow**, specify an optional reason (e.g., "Pre-migration checkpoint"), and click the green **Run workflow** button.
- **Via GitHub CLI (`gh`):**
  ```bash
  gh workflow run backup-neon-to-r2.yml -f reason="Pre-deployment snapshot"
  ```

---

### 5.2 Verifying Uploaded Objects & SHA-256 Checksums

To verify backups stored in Cloudflare R2 from your local machine:

1. **Configure local AWS CLI credentials for R2:**
   ```bash
   export AWS_ACCESS_KEY_ID="<R2_ACCESS_KEY_ID>"
   export AWS_SECRET_ACCESS_KEY="<R2_SECRET_ACCESS_KEY>"
   export AWS_DEFAULT_REGION="auto"
   export R2_ENDPOINT="https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com"
   ```
2. **List backups in the bucket:**
   ```bash
   aws s3 ls s3://vibelock-db-backups/postgres/ --endpoint-url "$R2_ENDPOINT"
   ```
   _Expected output: List of `.dump.age` and `.dump.age.sha256` files._
3. **Download a specific backup artifact:**
   ```bash
   TARGET_FILE="vibelock-YYYY-MM-DD-HHmmss"
   aws s3 cp "s3://vibelock-db-backups/postgres/${TARGET_FILE}.dump.age" . --endpoint-url "$R2_ENDPOINT"
   aws s3 cp "s3://vibelock-db-backups/postgres/${TARGET_FILE}.dump.age.sha256" . --endpoint-url "$R2_ENDPOINT"
   ```
4. **Verify SHA-256 integrity:**
   ```bash
   sha256sum -c "${TARGET_FILE}.dump.age.sha256"
   # Must return: vibelock-YYYY-MM-DD-HHmmss.dump.age: OK
   ```

---

### 5.3 Decrypting a Backup Locally

Using your offline preserved `vibelock-backup-identity.txt`:

```bash
age --decrypt \
  -i vibelock-backup-identity.txt \
  -o vibelock-decrypted.dump \
  vibelock-YYYY-MM-DD-HHmmss.dump.age
```

Verify that the decrypted file is a valid PostgreSQL custom-format archive:

```bash
pg_restore --list vibelock-decrypted.dump | head -n 25
```

_Expected output: Valid TOC table of contents listing schemas, tables, and sequence definitions._

---

### 5.4 Restoring into a Staging Database (Never Production!)

> [!CAUTION]
> **Zero Production Testing:** Never execute `pg_restore` against the production database URL. Always create a new isolated Neon development/staging branch or a separate PostgreSQL container.

1. **Create an isolated Neon target branch or staging database:**
   ```bash
   # Example: Create an isolated Neon test branch
   neonctl branches create --name staging-restore-drill --parent main
   ```
2. **Execute restoration into the staging database:**
   ```bash
   pg_restore \
     --dbname="<STAGING_DIRECT_URL>" \
     --clean \
     --if-exists \
     --no-owner \
     --no-privileges \
     --verbose \
     vibelock-decrypted.dump
   ```
3. **Clean up decrypted plaintext dump:**
   ```bash
   rm -f vibelock-decrypted.dump
   ```

### 5.5 Verified Restore Drill — November 17, 2026

**Result: SUCCESS.** The manual Neon-to-R2 backup artifact was downloaded, integrity-checked, decrypted locally, validated with PostgreSQL 18 tools, and restored into the separate Neon project `VibeLock-Staging`.

| Check                      | Verified result                                                      |
| :------------------------- | :------------------------------------------------------------------- |
| Backup object              | `postgres/vibelock-2026-11-17-164031.dump.age`                       |
| Backup timestamp           | 2026-11-17 16:40:31 UTC                                              |
| Encrypted artifact SHA-256 | `cf58b4c1657ec5395754c292b5f6cb68ad5bff782d309a73078697e4d548a538`   |
| Archive format             | PostgreSQL custom format                                             |
| Source dump version        | pg_dump 18.6; source PostgreSQL 18.7                                 |
| Archive TOC                | 204 entries (215 listed objects)                                     |
| Restore utility            | pg_restore 18.6                                                      |
| Restore target             | Neon project `VibeLock-Staging`, branch `Staging`, database `neondb` |
| Target region              | AWS Asia Pacific 1 (Singapore)                                       |
| Post-restore public tables | 35                                                                   |
| Prisma migration records   | 12                                                                   |
| Restore command result     | `STAGING RESTORE COMPLETED SUCCESSFULLY.`                            |

#### 5.5.1 Exact Verification Queries for Restored Staging Database

Execute these queries against the restored staging database (`VibeLock-Staging`) to verify structure and migration counts:

```sql
-- 1. Verify Public Base Tables Count (Verified count: 35)
SELECT COUNT(*) AS total_public_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- 2. Verify Applied Prisma Migrations Count (Verified count: 12)
SELECT COUNT(*) AS total_applied_migrations
FROM "_prisma_migrations"
WHERE rolled_back_at IS NULL;

-- 3. Inspect All Applied Migrations in Order
SELECT id, migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY finished_at ASC;
```

**Production safety:** The restore was executed only against the separate staging project. No production database, production branch, production schema, or production migration was modified.

**Important validation boundary:** The archive checksum, decryption, archive listing, restore completion, public table count, and Prisma migration count were verified. The SQL orphan-record and inventory-ledger queries in Section 6, plus application-level admin/order workflows, remain follow-up validation items; do not mark those checks complete until their outputs are recorded.

### 5.6 Vercel Preview Isolation — Staging Branch

Vercel project `vibelock` uses the Git branch `staging` for the staging Preview deployment. Environment variable scope was reviewed and adjusted on November 18, 2026:

- `DATABASE_URL` and `DIRECT_URL` have branch-specific Preview entries for `staging`, in addition to generic Preview fallbacks. Confirm the branch-specific values point to the separate `VibeLock-Staging` Neon project before running database-backed tests. Secret values must never be copied into logs or this document.
- `AUTH_SECRET` remains Preview-only and separate from the Production value.
- bKash and SSLCOMMERZ credential variables are Production-only. The `staging` Preview branch has explicit `BKASH_SANDBOX=true` and `SSLCOMMERZ_SANDBOX=true` overrides.
- `SHIPPING_PROVIDER` is Production-only. Courier webhook secret remains Production-only; do not add live courier credentials to Preview.
- `RESEND_API_KEY`, `EMAIL_FROM`, Cloudinary write credentials, and Upstash credentials are Production-only in the reviewed configuration. No email/SMS gateway credentials should be added to Preview.
- Production values were preserved; only environment targets were narrowed to Production and branch-scoped sandbox flags were added for Preview.

**Code behavior note:** SMS dispatch is gated by `NODE_ENV === "production"` and requires `SMS_API_KEY`. Vercel Preview can run with production-mode Node settings, so Preview must not receive `SMS_API_KEY` or `SMS_API_URL`. The current reviewed Vercel environment list did not contain those SMS variables.

**Deployment protection:** Keep Preview deployments protected. The Vercel project currently reports SSO protection enabled for deployments other than custom domains; do not add a public custom domain to staging. A restored production-data clone contains personal/customer/order data and must be treated as sensitive.

**Operational note:** Environment-variable changes apply to new deployments. Redeploy the `staging` branch after changing Preview variables and verify the resulting deployment before testing. Never use a Preview deployment as evidence of Production health.

### 5.7 Staging Preview HTTP Smoke-Test Snapshot — November 18, 2026

The Vercel deployment for branch `staging` reached `READY` and returned HTTP responses for these unauthenticated GET requests:

| Route                | HTTP result | Interpretation                                                      |
| :------------------- | :---------: | :------------------------------------------------------------------ |
| `/`                  |     200     | Storefront route responds                                           |
| `/products`          |     200     | Product listing route responds                                      |
| `/category/t-shirts` |     200     | Category route responds                                             |
| `/login`             |     200     | Login route responds                                                |
| `/register`          |     200     | Registration route responds                                         |
| `/cart`              |     200     | Cart route responds                                                 |
| `/account`           |     200     | Route responds; authenticated account behavior not verified         |
| `/account/orders`    |     200     | Route responds; authenticated order data not verified               |
| `/admin`             |     200     | Route responds; admin authorization not verified                    |
| `/shop`              |     404     | This path is not a valid route in the tested build; use `/products` |
| `/api/health`        |     404     | No health endpoint exists at this path in the tested build          |

All tested Preview responses included `X-Robots-Tag: noindex`.

**Blocking findings before calling the staging drill application-complete:**

1. The tested staging deployment's canonical metadata pointed to `https://vibelock.com.bd`, which is not the VibeLock production canonical domain. Do not promote this staging deployment or treat its SEO metadata as correct. The production canonical domain remains `https://vibelock.bd`; fix and verify the branch before any production release. _(Resolved: Canonical domain configuration is defined as `https://vibelock.bd` in application site configuration `src/lib/seo/site.ts`)._
2. The tested deployment was built from staging commit `9f536757feed09e939002a14c6c3d68592a7279f` (October 10, 2026), not a current post-restore application commit. Re-deploy the intended, current staging commit before functional testing.
3. HTTP 200 alone does not prove that authentication, authorization, product queries, cart persistence, checkout, order history, or admin workflows work. Those require browser/session tests using designated staging accounts and non-live integrations.
4. Do not test real payment capture, real SMS/email delivery, or courier dispatch from staging. Use sandbox credentials and mocked courier behavior only.

This snapshot is a route-level smoke test, not a full end-to-end acceptance test.

---

## 6. Read-Only Restore Integrity Verification Suite

Execute these SQL validation checks against the **restored staging database** to confirm data completeness and relational integrity.

### 6.1 Critical Table Existence & Row Population

```sql
SELECT table_name,
       (xpath('/row/cnt/text()', xml_count))[1]::text::int AS approximate_row_count
FROM (
  SELECT table_name,
         query_to_xml(format('SELECT count(*) as cnt FROM public.%I', table_name), false, true, '') as xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'User', 'Account', 'Session', 'Product', 'ProductVariant', 'ProductImage',
      'Category', 'Order', 'OrderItem', 'OrderHistory', 'Payment', 'Refund',
      'ReturnRequest', 'ReturnItem', 'InventoryTransaction', 'InventoryReservation',
      'Shipment', 'AuditLog', '_prisma_migrations'
    )
) sub
ORDER BY table_name;
```

### 6.2 Referential Integrity & Orphan Record Check (Must return 0)

```sql
SELECT 'Orphan OrderItems' AS check_name, COUNT(*) AS anomaly_count
FROM "OrderItem" oi
LEFT JOIN "Order" o ON oi."orderId" = o.id
WHERE o.id IS NULL

UNION ALL

SELECT 'Orphan Payments' AS check_name, COUNT(*) AS anomaly_count
FROM "Payment" p
LEFT JOIN "Order" o ON p."orderId" = o.id
WHERE o.id IS NULL

UNION ALL

SELECT 'Orphan Refunds' AS check_name, COUNT(*) AS anomaly_count
FROM "Refund" r
LEFT JOIN "Payment" p ON r."paymentId" = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 'Orphan ReturnRequests' AS check_name, COUNT(*) AS anomaly_count
FROM "ReturnRequest" rr
LEFT JOIN "Order" o ON rr."orderId" = o.id
WHERE o.id IS NULL

UNION ALL

SELECT 'Orphan InventoryTransactions' AS check_name, COUNT(*) AS anomaly_count
FROM "InventoryTransaction" it
LEFT JOIN "ProductVariant" pv ON it."variantId" = pv.id
WHERE pv.id IS NULL;
```

### 6.3 Inventory Ledger Invariant Consistency

Verifying the authoritative formula from `docs/database.md`:
$$\text{availableStock} = \sum \text{InventoryTransaction.quantity} - \sum \text{InventoryReservation.quantity (status = 'RESERVED')}$$

```sql
WITH stock_ledger AS (
    SELECT
        pv.id AS variant_id,
        pv.sku,
        COALESCE(SUM(it.quantity), 0) AS current_stock
    FROM "ProductVariant" pv
    LEFT JOIN "InventoryTransaction" it ON it."variantId" = pv.id
    GROUP BY pv.id, pv.sku
),
active_reservations AS (
    SELECT
        "variantId" AS variant_id,
        COALESCE(SUM(quantity), 0) AS reserved_stock
    FROM "InventoryReservation"
    WHERE status = 'RESERVED'
    GROUP BY "variantId"
)
SELECT
    sl.variant_id,
    sl.sku,
    sl.current_stock,
    COALESCE(ar.reserved_stock, 0) AS reserved_stock,
    (sl.current_stock - COALESCE(ar.reserved_stock, 0)) AS available_stock
FROM stock_ledger sl
LEFT JOIN active_reservations ar ON ar.variant_id = sl.variant_id
WHERE (sl.current_stock - COALESCE(ar.reserved_stock, 0)) < 0
LIMIT 20;
-- Expected: 0 rows (proves no negative available stock anomalies exist)
```

---

## 7. Security Incident Response & Credential Rotation

### 7.1 How to Rotate Cloudflare R2 Credentials

If R2 API tokens expire or need routine rotation:

1. Log in to the Cloudflare Dashboard $\rightarrow$ **R2** $\rightarrow$ **Manage R2 API Tokens**.
2. Click **Create API Token**:
   - Token Name: `vibelock-backup-automation-v2`
   - Permissions: **Object Read & Write**
   - Bucket Scope: Specific bucket $\rightarrow$ `vibelock-db-backups`
   - TTL: As desired (or standard non-expiring for automated pipelines).
3. Copy the new **Access Key ID** and **Secret Access Key**.
4. In GitHub: Navigate to **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
5. Update `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` with the new values.
6. Trigger a manual workflow run (`backup-neon-to-r2.yml`) to verify successful upload with the new credentials.
7. Return to Cloudflare Dashboard and **Revoke** the previous API token.

---

### 7.2 Compromise Response Protocols

| Compromise Scenario                                                  | Threat Impact                                                           | Required Immediate Containment Actions                                                                                                                                                                                                                                                                                                                                                                                |
| :------------------------------------------------------------------- | :---------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R2 API Token Compromised**                                         | Attacker has read/write access to R2 bucket.                            | 1. Immediately revoke the token in Cloudflare Dashboard.<br>2. Generate a new R2 API token and update GitHub Secrets (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).<br>3. Inspect bucket object list for unauthorized additions or deletions.<br>_(Note: Existing backups remain encrypted with `age`; attacker cannot read database contents without the offline private key)._                                       |
| **Database Credentials (`DIRECT_URL` / `DATABASE_URL`) Compromised** | Attacker has direct or pooled read/write access to production database. | 1. Reset database user password immediately in Neon Console.<br>2. Update `DATABASE_URL` (pooled) and `DIRECT_URL` (unpooled) in Vercel environment variables.<br>3. Update **`DIRECT_URL`** in GitHub Actions Secrets (the secret read by the backup workflow and migration jobs; do not confuse with the application's `DATABASE_URL`).<br>4. Inspect database audit logs in Neon Console for unauthorized queries. |
| **`age` Private Key Compromised**                                    | Attacker with bucket access can decrypt backup archives.                | 1. Generate a new `age` key pair locally (`age-keygen`).<br>2. Update `BACKUP_AGE_RECIPIENT` in GitHub Actions Secrets.<br>3. Trigger an immediate manual backup to produce a backup under the new key.<br>4. Securely archive or re-encrypt historical backups under the new key.                                                                                                                                    |
| **GitHub Actions Runner Compromised**                                | Attacker compromises CI environment during execution.                   | 1. Rotate all repository secrets in GitHub Actions: update `DIRECT_URL` (direct database compute connection), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_ACCOUNT_ID`.<br>2. Revoke GitHub personal access tokens and review repository collaborator permissions.<br>3. Audit workflow run logs and Neon query logs.                                                                                          |

---

## 8. Production Disaster Recovery Runbook (Destructive — Approval Required)

### 8.1 Critical Safety Boundary & Authorization

> [!CAUTION]
> **HIGH-RISK DESTRUCTIVE OPERATION — STRICT WRITTEN OWNER APPROVAL REQUIRED**
> Restoring a database snapshot into Production is a catastrophic recovery procedure. Any transaction, customer account, or order created after the backup snapshot timestamp will be permanently lost unless manually reconciled from gateway logs.
>
> - **NEVER** run `pg_restore` directly against the live Production database without explicit, written authorization from the Project Owner.
> - **NEVER** overwrite existing data in-place when Point-in-Time Recovery (PITR) or branch-swapping can achieve zero data loss.
> - **ALWAYS** perform a pre-recovery safety dump of the existing production database before initiating any recovery cutover.

---

### 8.2 Disaster Recovery Decision Framework (Neon Branching vs. R2 Cold Restore)

> [!IMPORTANT]
> **Neon PITR Limits Require Dashboard Verification:**
> Continuous WAL retention and Point-in-Time Recovery (PITR) / time-travel branching in Neon depend strictly on the active project plan and configured history retention (configurable in Neon Console $\rightarrow$ Project Settings $\rightarrow$ History Retention). The repository does not specify or guarantee a fixed PITR history retention limit (such as 6 hours). Operators must inspect the active Neon Console to confirm the available retention window before attempting branching.

The operational choice between **Neon Branching (PITR)** and **Cloudflare R2 Cold Restore** depends on four technical criteria:

1. **Available PITR History Window:** Check Neon Console $\rightarrow$ Project Settings $\rightarrow$ History Retention. Does the active Neon project retain continuous WAL history to a timestamp $T_{\text{safe}}$ prior to the incident?
2. **Incident Scope & Infrastructure Health:**
   - Logical corruption / accidental DDL / bad migration within an accessible Neon project: Neon branching is preferred if within history limits.
   - Catastrophic failure / Neon account loss / provider outage: Offsite Cloudflare R2 backup is the independent source of truth.
3. **Backup Age & Data-Loss Tolerance (RPO):**
   - Branching can pinpoint an exact timestamp down to the second immediately preceding corruption.
   - R2 cold restore rolls back to the latest completed backup snapshot (which may be up to 24 hours old under daily scheduling), requiring gateway payment reconciliation for the delta window.
4. **Recovery Time Objective (RTO):** Neon branching creates a new branch compute endpoint in seconds; R2 cold restore requires downloading, decrypting with the offline key, and executing `pg_restore` (several minutes).

#### Recovery Decision Matrix

| Incident Scenario                                       | Evaluation Condition                                                                                                | Primary Recovery Method                                                                                                                                        | Secondary / Fallback Method                                                                   |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **Accidental DDL / Bad Migration / Logical Corruption** | Incident occurred **within available Neon PITR retention window** (verified in Neon Console)                        | **Neon Point-in-Time Recovery (PITR):** Create an isolated recovery branch from `main` at timestamp $T_{\text{safe}}$ immediately prior to the event.          | Restore latest verified R2 backup into a new isolated recovery branch or database.            |
| **Data Corruption Beyond PITR History**                 | Incident occurred **outside available Neon PITR retention window**, or PITR is exhausted/unsupported on active plan | **Cloudflare R2 Encrypted Backup Restore:** Download `.dump.age`, verify SHA-256, decrypt with offline key, and restore into a new clean database/branch.      | Reconcile missing transactions from gateway/courier logs from snapshot time to incident time. |
| **Catastrophic Failure / Neon Account or Project Loss** | Neon project or AWS Singapore infrastructure is completely unavailable, corrupted, or deleted                       | **Cross-Provider / Fresh Instance R2 Restore:** Provision a new PostgreSQL instance (Neon or alternative cloud PostgreSQL) and restore from R2 offsite backup. | None (Offsite Cloudflare R2 backup is the independent source of truth).                       |

---

### 8.3 Step-by-Step Production Cutover Workflow (Branch Switch Pattern)

To achieve zero downtime and eliminate the risk of a botched in-place restore, VibeLock uses the **Connection String Cutover Pattern** rather than in-place database drops.

> [!CAUTION]
> **MANDATORY OWNER APPROVAL — NO AUTOMATIC CUTOVER:**
>
> - Production database connection string changes are **NEVER** automated.
> - Every step in this workflow requires explicit, written approval from the Project Owner.
> - **Zero Production Targeting in Restore:** All restore commands restore into an **isolated recovery target** (`$RECOVERY_TARGET_DIRECT_URL`). Never execute `pg_restore` against the active production compute (`$PROD_DIRECT_URL`).
> - Destructive recovery commands must **never** be executed during routine audits, staging smoke tests, or preflight checks.

```mermaid
flowchart TD
    Incident["1. Incident Detected & Class 1 Severity Declared"]
    Auth["2. Written Owner Authorization Received"]
    Freeze["3. Write Freeze: Enable Maintenance Mode & Pause Webhooks"]
    PreDump["4. Pre-Recovery Snapshot: Dump live database to local safety file (READ-ONLY)"]
    Restore["5. Restore & Verify: Restore R2 dump into NEW isolated Neon branch/database"]
    Verify["6. Run Read-Only Verification Suite (35 tables, 12 migrations, 0 orphans)"]
    Cutover["7. Cutover (OWNER APPROVAL REQUIRED): Update DATABASE_URL & DIRECT_URL in Vercel"]
    Redeploy["8. Redeploy Production on Vercel (Flush cache & connection pool)"]
    Smoke["9. Smoke Test Storefront Routes & Verify DB Writes"]
    Unfreeze["10. Lift Maintenance Mode & Resume Traffic"]
    Reconcile["11. Reconcile SSLCOMMERZ gateway payments during delta gap"]

    Incident --> Auth --> Freeze --> PreDump --> Restore --> Verify --> Cutover --> Redeploy --> Smoke --> Unfreeze --> Reconcile
```

#### Detailed Execution Steps:

1. **Declare Write Freeze:** Enable Maintenance Mode in Vercel middleware and pause webhook ingest for SSLCOMMERZ and shipping partners to prevent in-flight customer writes.
2. **Execute Pre-Recovery Safety Snapshot (READ-ONLY):** Even if current data is corrupted, capture an immutable snapshot of the live database for forensic auditing before any cutover:
   ```bash
   # Read-only custom-format dump of live production database for safety/forensics
   pg_dump --dbname="$PROD_DIRECT_URL" --format=custom --file="vibelock-pre-recovery-safety-$(date +%s).dump"
   ```
3. **Provision Clean Recovery Target (ISOLATED TARGET ONLY):**
   - In Neon Console: Create a new project or isolated branch (e.g., `prod-recovery-YYYYMMDD`).
   - Record its direct unpooled connection string as `RECOVERY_TARGET_DIRECT_URL` and pooled connection string as `RECOVERY_TARGET_DATABASE_URL`.
   - **CRITICAL SAFETY RULE:** Do NOT set `RECOVERY_TARGET_DIRECT_URL` to the live production database (`PROD_DIRECT_URL`).
4. **Download, Decrypt & Restore (DESTRUCTIVE TO ISOLATED TARGET ONLY — NOT FOR AUDITS):**
   ```bash
   # 1. Download encrypted dump and checksum from R2
   aws s3 cp s3://vibelock-db-backups/postgres/<BACKUP_FILE>.dump.age . --endpoint-url "$R2_ENDPOINT"
   aws s3 cp s3://vibelock-db-backups/postgres/<BACKUP_FILE>.dump.age.sha256 . --endpoint-url "$R2_ENDPOINT"

   # 2. Verify integrity before decryption
   sha256sum -c <BACKUP_FILE>.dump.age.sha256

   # 3. Decrypt with offline master private key
   age --decrypt -i vibelock-backup-identity.txt -o recovery.dump <BACKUP_FILE>.dump.age

   # 4. Validate archive TOC (Read-only check)
   pg_restore --list recovery.dump | head -n 30

   # 5. Restore into the NEW clean recovery target (NEVER into PROD_DIRECT_URL)
   pg_restore --dbname="$RECOVERY_TARGET_DIRECT_URL" --clean --if-exists --no-owner --no-privileges -v recovery.dump

   # 6. Immediately securely delete local plaintext dump
   rm -f recovery.dump
   ```
5. **Execute Read-Only Integrity Suite:** Run the SQL queries in Section 6 against the isolated recovery target:
   - Confirm 35 public base tables.
   - Confirm 12 applied Prisma migrations.
   - Confirm 0 orphan records across OrderItems, Payments, Refunds, ReturnRequests, and InventoryTransactions.
6. **Switch Connection Strings in Vercel (REQUIRES EXPLICIT WRITTEN OWNER APPROVAL):**
   - **No Automatic Cutover:** This step modifies live production traffic routing and requires manual operator action.
   - **Pre-Cutover Recording of Settings:** Record the existing production `DATABASE_URL` and `DIRECT_URL` values before changing them to enable immediate rollback if needed.
   - In Vercel Project Settings $\rightarrow$ Environment Variables $\rightarrow$ Production:
     - Update `DATABASE_URL` $\rightarrow$ Set to `RECOVERY_TARGET_DATABASE_URL` (pooled connection string for the recovery compute).
     - Update `DIRECT_URL` $\rightarrow$ Set to `RECOVERY_TARGET_DIRECT_URL` (unpooled connection string for the recovery compute).
7. **Redeploy Production:** Trigger a production deployment in Vercel to establish connections to the new database and purge edge caches.
8. **Smoke Test & Lift Freeze:** Test critical storefront routes (`/`, `/products`, `/cart`, `/login`), place a test order with a designated test customer account, verify database persistence, and then remove Maintenance Mode.
9. **Financial Reconciliation:** Pull transaction reports from SSLCOMMERZ merchant portal for transactions processed between the backup snapshot time and the cutover time, ensuring every customer payment has a corresponding order record.

---

### 8.3.1 Rollback Procedure & Data-Loss Protection (Reverting Production Cutover)

> [!CAUTION]
> **CRITICAL DATA-LOSS WARNING ON ROLLBACK:**
>
> - **Post-Cutover Writes:** Once production traffic was directed to the recovery database, subsequent customer orders, user registrations, payment confirmations, and inventory updates may have been committed to it.
> - **Silent Data Loss Risk:** Simply reverting `DATABASE_URL` and `DIRECT_URL` in Vercel to the previous database is **NOT** a complete or data-safe rollback on its own. Any transaction created on the recovery database after cutover will be stranded or permanently lost if connection strings are blindly swapped back.
> - **Stop Writes First:** Application writes must be halted immediately (via Maintenance Mode) before any rollback actions begin.
> - **Evaluate & Reconcile Before Reverting:** Operators must dump the recovery database and evaluate/reconcile post-cutover delta data (Orders, Payments, Users, Inventory) against gateway logs before switching connection strings.

If post-cutover smoke tests fail, data anomalies are discovered, or the Project Owner authorizes aborting the cutover:

1. **Stop Application Writes (Immediate Write Freeze):** Maintain or immediately re-enable storefront Maintenance Mode in Vercel and pause webhook ingest to stop new writes to the recovery database.
2. **Capture Encrypted Post-Cutover Delta Snapshot:** Stream custom-format dump directly into `age` encryption to preserve all delta transactions without writing unencrypted plaintext to disk:
   ```bash
   # Enable pipefail so a pg_dump failure aborts the pipeline and cannot produce a truncated encrypted file
   set -o pipefail

   # Stream dump from recovery target directly into age encryption using the public recipient key
   DELTA_FILE="vibelock-post-cutover-delta-$(date +%s).dump.age"
   pg_dump --dbname="$RECOVERY_TARGET_DIRECT_URL" --format=custom | age -r "$BACKUP_AGE_RECIPIENT" -o "$DELTA_FILE"

   # Generate cryptographic checksum immediately
   sha256sum "$DELTA_FILE" > "${DELTA_FILE}.sha256"
   ```
   **Artifact Handling & Verification:**
   - **Target Isolation:** Reads exclusively from `$RECOVERY_TARGET_DIRECT_URL`. Never target or connect to `$PROD_DIRECT_URL`.
   - **Pipeline Integrity (`set -o pipefail`):** Standard shell pipelines only report the exit status of the final command (`age`). `set -o pipefail` ensures that if `pg_dump` fails (e.g., connection drop, serialization failure), the pipeline exits with an error status and cannot produce a silent, empty, or corrupt `.dump.age` artifact.
   - **Zero Plaintext on Disk:** Streaming stdout directly into `age -r "$BACKUP_AGE_RECIPIENT"` ensures sensitive customer records and payment details are never written unencrypted to the local filesystem.
   - **Archive TOC Verification:** Operators can verify archive integrity without writing plaintext to disk by streaming decryption into `pg_restore --list`:
     ```bash
     age --decrypt -i vibelock-backup-identity.txt "$DELTA_FILE" | pg_restore --list | head -n 30
     ```
3. **Evaluate & Reconcile Post-Cutover Records:**
   - Query tables (`Order`, `Payment`, `User`, `InventoryTransaction`) on `$RECOVERY_TARGET_DIRECT_URL` for rows created after the cutover timestamp $T_{\text{cutover}}$.
   - Cross-check against SSLCOMMERZ gateway transactions. If transactions occurred, record their IDs for manual reconciliation or re-insertion before reverting.
4. **Revert Connection Strings in Vercel (Owner Approval Required):**
   - In Vercel Project Settings $\rightarrow$ Environment Variables $\rightarrow$ Production:
   - Revert `DATABASE_URL` to the pre-cutover production pooled connection string.
   - Revert `DIRECT_URL` to the pre-cutover production unpooled connection string.
5. **Redeploy Production on Vercel:** Trigger an immediate redeployment in Vercel to reconnect application instances to the original database and purge cached pools.
6. **Verify Connectivity to Original Database:** Run unauthenticated smoke tests against `/` and `/products` to confirm the application successfully reconnects to the original database.
7. **Post-Rollback Data Reconciliation:** Decrypt the verified delta artifact in an isolated environment and safely reconcile any legitimate post-cutover orders or customer updates back into the active production database.
8. **Investigate Recovery Failure:** Keep the recovery target database (`RECOVERY_TARGET_DIRECT_URL`) intact for offline forensic analysis. Do not delete it until the root cause of the incident is resolved.

---

### 8.4 Emergency Disaster Recovery Checklist

```markdown
[ ] 1. INCIDENT DECLARED: Classify severity (SEV-1). Notify Project Owner.
[ ] 2. OWNER AUTHORIZATION: Obtain written owner authorization before touching production.
[ ] 3. WRITE FREEZE: Enable Maintenance Mode on Vercel; pause payment/courier webhooks.
[ ] 4. FORENSIC RECORD: Record incident detection time and save current database logs.
[ ] 5. PRE-RECOVERY SNAPSHOT: Execute read-only pg_dump against current production for forensic safety.
[ ] 6. SELECT RECOVERY SOURCE: - Verify active Neon PITR history window in Neon Console. - If corruption occurred within available PITR history and Neon is healthy: Create isolated Neon branch at T_safe via Neon Console / CLI. - If corruption exceeds PITR history or Neon project is lost/unreachable: Download latest offsite backup from R2, verify SHA-256, decrypt with offline age key.
[ ] 7. RESTORE TO ISOLATED TARGET: Restore into a NEW isolated Neon branch or database (NEVER in-place production; NEVER target production DIRECT_URL).
[ ] 8. VERIFY INTEGRITY: Execute read-only SQL verification suite (Section 6) on the isolated recovery target. - Confirm 35 public base tables. - Confirm 12 Prisma migrations. - Confirm 0 orphan records. - Confirm inventory ledger invariant holds.
[ ] 9. PRISMA VALIDATION: Run `npm run db:validate` against isolated recovery target.
[ ] 10. MEDIA AUDIT: Check Cloudinary image URLs for HTTP 200 reachability.
[ ] 11. CUTOVER APPROVAL: Present verification evidence to Owner. Receive explicit written approval before modifying production connection strings.
[ ] 12. SWITCH CONNECTION: Record original connection strings for rollback, then update DATABASE_URL and DIRECT_URL in Vercel Production secrets.
[ ] 13. REDEPLOY: Deploy production on Vercel and verify cache purge.
[ ] 14. SMOKE TESTS: Execute GET smoke tests on /, /products, /login, /register, and cart. If smoke tests fail or rollback is needed, execute Rollback Procedure (Section 8.3.1: halt writes, capture encrypted recovery delta dump, reconcile records before reverting connection strings).
[ ] 15. RESTORE TRAFFIC: Disable Maintenance Mode.
[ ] 16. RECONCILIATION: Audit SSLCOMMERZ gateway transactions during delta gap; notify affected users.
[ ] 17. POST-MORTEM: Complete blameless post-mortem report.
```

---

## 9. Retention Policy & Schedule Verification Guide

### 9.1 Cloudflare R2 Retention Policy & Lifecycle Status

The offsite backup architecture strictly distinguishes between verified object storage, unverified lifecycle rules, intended retention policies, and actual object retention behavior:

| Status Dimension                          | Current Operational State                        | Verification Evidence / Method                                                                                                                                                    | Operational Significance                                                                                                                            |
| :---------------------------------------- | :----------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Verified Backup Object Storage**        | **VERIFIED**                                     | GitHub Actions Run ID `44128346808` successfully uploaded `postgres/vibelock-2026-11-17-164031.dump.age` (117,019 B) and `.sha256` (102 B), verified with a remote SHA-256 match. | Encrypted dumps are confirmed properly structured and written to the `vibelock-db-backups` bucket.                                                  |
| **Unverified Cloudflare Lifecycle Rules** | **UNVERIFIED (Requires Dashboard Verification)** | Programmatic S3 API lifecycle rule inspection is not configured in local tooling; Cloudflare Dashboard access is required.                                                        | It is **unconfirmed** whether automatic deletion rules are currently enabled in the bucket. Operators must not assume automatic deletion is active. |
| **Intended Retention Policy**             | **7-Day Sliding Window**                         | Architecture design specification (Section 2.2 / 2.3).                                                                                                                            | Designed to automatically prune backup objects older than 7 days, maintaining a steady-state storage footprint under 350 MB (< 4% of free tier).    |
| **Actual Retention Once Confirmed**       | **Persistent until rules confirmed/configured**  | Absent active lifecycle rules in Cloudflare R2, objects persist indefinitely. Once confirmed or added in Cloudflare Console, actual retention matches the 7-day rule.             | Until an operator verifies or creates the rules in Cloudflare Dashboard, backup objects will accumulate indefinitely without automatic pruning.     |

#### Required Cloudflare Dashboard Verification Procedure:

1. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **R2** $\rightarrow$ **Overview** $\rightarrow$ Click **`vibelock-db-backups`**.
3. Select the **Settings** tab.
4. Scroll down to the **Object Lifecycle Rules** section.
5. Check whether the following two rules exist:
   - **Rule 1 (Dump Expiration):** Prefix `postgres/` $\rightarrow$ Action: **Delete objects** after **7 days**.
   - **Rule 2 (Multipart Cleanup):** Bucket-wide (or Prefix `postgres/`) $\rightarrow$ Action: **Abort incomplete multipart uploads** after **7 days**.
6. **Action if missing:** If no lifecycle rules appear, click **Add rule** to configure both rules according to the intended specification above.

---

### 9.2 Daily Schedule & Bangladesh Time Conversion

| Parameter                      | Specification                                                            | Details                                                                                                                                                                                                                |
| :----------------------------- | :----------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Configured Cron Expression** | `'0 3 * * *'`                                                            | Runs daily at 03:00 UTC.                                                                                                                                                                                               |
| **Timezone Conversion**        | $\text{03:00 UTC} + 6\text{h} = \mathbf{09:00 \text{ Asia/Dhaka (BST)}}$ | 09:00 AM Bangladesh Standard Time (UTC+6).                                                                                                                                                                             |
| **Operational Rationale**      | Off-peak morning window                                                  | Selected to run before peak e-commerce browsing hours in Bangladesh while compute load is minimal.                                                                                                                     |
| **Current Operational Status** | **DISABLED / COMMENTED OUT**                                             | In `.github/workflows/backup-neon-to-r2.yml`, lines 6–8 are commented out. The workflow operates in **manual-only mode (`workflow_dispatch`)** until the repository owner explicitly approves enabling the daily cron. |

---

## 10. Troubleshooting Common Backup & Restore Failures

### 10.1 Backup Pipeline Failure Modes (GitHub Actions)

| Error Message / Symptom                                                                          | Root Cause                                                                                          | Resolution Step                                                                                                                                                                        |
| :----------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pg_dump: error: connection to server at ... failed: FATAL: password authentication failed`      | `DIRECT_URL` secret has expired, contains mistyped credentials, or password was rotated in Neon.    | Verify and update `DIRECT_URL` in GitHub Actions Secrets (`Settings` $\rightarrow$ `Secrets` $\rightarrow$ `Actions`). Must be the unpooled compute connection string.                 |
| `pg_dump: error: query failed: ERROR: prepared transactions are not supported on pooler`         | Workflow attempted to connect via pooled `DATABASE_URL` (PgBouncer) instead of direct `DIRECT_URL`. | Ensure `secrets.DIRECT_URL` points directly to the Neon compute endpoint (port 5432, `ep-...`), not the PgBouncer pooler (`ep-...-pooler...`).                                         |
| `age: error: recipient "..." has unrecognized format`                                            | `BACKUP_AGE_RECIPIENT` secret is malformed, missing, or contains leading/trailing whitespace.       | Re-copy the public recipient key generated by `age-keygen`. Key must begin with `age1...` (e.g. `age1ql3z...`). Never paste the private `AGE-SECRET-KEY-1...` key into GitHub Secrets. |
| `upload failed: ... An error occurred (InvalidAccessKeyId) when calling the PutObject operation` | `R2_ACCESS_KEY_ID` or `R2_SECRET_ACCESS_KEY` is invalid, revoked, or mistyped.                      | Re-generate API token in Cloudflare Dashboard (`R2` $\rightarrow$ `Manage R2 API Tokens`) with Object Read & Write permissions and update GitHub Secrets.                              |
| `upload failed: ... An error occurred (AccessDenied) when calling the PutObject operation`       | R2 API token is scoped to a different bucket or lacks Write permissions.                            | Confirm token permission includes **Object Read & Write** and bucket scope includes `vibelock-db-backups`.                                                                             |
| `Integrity check failed: Remote SHA-256 does not match local checksum`                           | Network corruption, interrupted upload, or multipart chunk mismatch during R2 upload.               | Workflow automatically fails and exits. Re-trigger manual workflow run (`backup-neon-to-r2.yml`). Inspect Cloudflare R2 status page if repeated.                                       |
| `Required secret '...' is missing or empty`                                                      | One of the 5 required secrets is missing from the GitHub Actions environment.                       | Ensure all 5 required secrets are configured in GitHub Repository Secrets: `DIRECT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, and `BACKUP_AGE_RECIPIENT`.      |

---

### 10.2 Decryption & Restore Failure Modes (Operator / Local)

| Error Message / Symptom                                                            | Root Cause                                                                              | Resolution Step                                                                                                                                        |
| :--------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `age: error: no identity matched any of the recipients`                            | Attempting decryption with the wrong identity file or key pair.                         | Use the exact private identity file (`vibelock-backup-identity.txt`) that corresponds to the `BACKUP_AGE_RECIPIENT` public key used during backup.     |
| `pg_restore: error: unsupported version (1.15) in file header`                     | Local `pg_restore` utility version is older than source `pg_dump` version.              | Upgrade local PostgreSQL client tools to match or exceed source database version (PostgreSQL 16+ or 18+). Run `pg_restore --version` to check.         |
| `pg_restore: error: could not execute query: ERROR: relation "..." already exists` | Target database already contains existing tables and `--clean --if-exists` was omitted. | Pass `--clean --if-exists` flags to `pg_restore`, or restore into an empty database / fresh Neon branch.                                               |
| `sha256sum: WARNING: 1 computed checksum did NOT match`                            | Downloaded `.dump.age` file is corrupted or incomplete.                                 | Re-download the backup file from R2 using `aws s3 cp`. Verify file size matches size recorded in GitHub Actions workflow log.                          |
| `could not connect to server: Connection refused / Operation timed out`            | Target Neon compute is suspended (scale-to-zero) or IP is blocked by network firewall.  | Connect via `psql` or Neon Console to wake the compute endpoint before running `pg_restore`. Ensure `sslmode=require` is present in connection string. |
