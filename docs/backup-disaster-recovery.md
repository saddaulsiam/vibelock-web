# VibeLock — Backup Architecture & Disaster Recovery Runbook

**Document Status:** ACTIVE IMPLEMENTATION (Automated Pipeline & Bucket Configured)
**Target System:** VibeLock E-Commerce Platform (`saddaulsiam/vibelock-web`)
**Repository Branch:** `feature/backup-automation`
**Storage Destination:** Cloudflare R2 (`vibelock-db-backups`)
**Automation Workflow:** `.github/workflows/backup-neon-to-r2.yml`
**Last Updated:** November 2026

---

## 1. Executive Summary & Infrastructure Baseline

### 1.1 Infrastructure Context

| Component | Production Configuration | Operational Role & Constraints |
| :--- | :--- | :--- |
| **Database Engine** | PostgreSQL 16 on Neon Serverless | Cloud-native serverless architecture with compute-storage separation. |
| **Cloud Region** | AWS Singapore (`ap-southeast-1`) | Database compute and storage endpoints located in Singapore. |
| **Database Plan** | **Neon Free Plan ($0/month)** | Shared compute, subject to inactivity scale-to-zero. |
| **Continuous PITR** | **6-Hour History Window** | Continuous WAL retention allows branching or rewinding within 6 hours. |
| **Connections** | Pooled (`DATABASE_URL`, port 5432) & Direct (`DIRECT_URL`, port 5432) | `DATABASE_URL` connects via PgBouncer; `DIRECT_URL` connects unpooled directly to compute. |
| **Hosting Platform** | Vercel (Edge & Serverless Node.js runtime) | Next.js App Router connected via environment secrets. |
| **ORM / Data Access** | Prisma ORM | Schema in `prisma/schema.prisma`; migrations via `prisma migrate deploy`. |
| **Offsite Backup Storage** | **Cloudflare R2 (`vibelock-db-backups`)** | Private S3-compatible object storage located in APAC region. |
| **Backup Automation** | GitHub Actions (`backup-neon-to-r2.yml`) | Automated daily backup at 03:00 UTC (09:00 Asia/Dhaka) + manual dispatch. |
| **Encryption Tool** | `age` (Actually Good Encryption) | Client-side public-key encryption before upload; private key preserved offline. |
| **Media Storage** | Cloudinary | Product images, customer return evidence, and avatars stored offsite. |

> [!IMPORTANT]
> **Production Safety Rule:** Under no circumstances should production data, production database branches, or production connection strings be modified or targeted during disaster recovery drills. All restore drills and verification routines must run against isolated recovery branches or separate staging databases.

---

## 2. Offsite Backup Architecture Design

### 2.1 Architecture Overview

The automated backup architecture implements a zero-trust, offsite storage strategy:

$$\text{Neon PostgreSQL} \xrightarrow[\text{SSL Unpooled}]{\text{pg\_dump -Fc}} \text{Plaintext Dump} \xrightarrow[\text{Recipient Key}]{\text{age encryption}} \text{Encrypted Dump} \xrightarrow[\text{S3 API}]{\text{Upload}} \text{Cloudflare R2}$$

```mermaid
flowchart TD
    subgraph Neon["Neon Infrastructure (AWS ap-southeast-1)"]
        Compute["Neon Compute Endpoint\n(DIRECT_URL, SSL required)"]
        Storage["Neon Storage Engine\n(6h Continuous WAL)"]
        Compute <--> Storage
    end

    subgraph GHA["GitHub Actions Runner (ubuntu-latest)"]
        Trigger["Trigger:\nDaily 03:00 UTC / Manual Dispatch"]
        Dump["pg_dump -Fc (Max Compression)\nSecure Temp Dir (chmod 700)"]
        Encrypt["age Public-Key Encryption\n(BACKUP_AGE_RECIPIENT)"]
        Purge["Immediate Plaintext Deletion"]
        Checksum["SHA-256 Checksum Calculation\n(*.dump.age.sha256)"]
        Upload["AWS CLI Upload\n(R2 S3-Compatible API)"]
        Verify["Remote Upload Verification\n(aws s3 ls check)"]

        Trigger --> Dump --> Encrypt --> Purge --> Checksum --> Upload --> Verify
    end

    subgraph R2["Cloudflare R2 (vibelock-db-backups, APAC)"]
        DumpObj["postgres/vibelock-YYYY-MM-DD-HHmmss.dump.age"]
        HashObj["postgres/vibelock-YYYY-MM-DD-HHmmss.dump.age.sha256"]
        Lifecycle["Lifecycle Rule:\nAuto-Delete after 7 Days\nAbort Multipart after 7 Days"]
        DumpObj --- Lifecycle
        HashObj --- Lifecycle
    end

    Compute -->|"TLS Stream"| Dump
    Upload -->|"Encrypted Artifact"| DumpObj
    Upload -->|"Hash File"| HashObj
```

---

### 2.2 Cloudflare R2 Configuration (Verified Baseline)

The offsite backup bucket has been provisioned under the owner's Cloudflare account:

| Setting | Value | Security / Operational Purpose |
| :--- | :--- | :--- |
| **Bucket Name** | `vibelock-db-backups` | Dedicated storage container for VibeLock database backups. |
| **Storage Class** | Standard | High durability, low latency access for restore drills. |
| **Location Hint** | APAC | Proximity to VibeLock Singapore database infrastructure. |
| **Public URL** | **Disabled** | Bucket is completely private; no public web access. |
| **Custom Domains** | **None** | No external domain routing; accessed strictly via S3 credentials. |
| **Lifecycle Rule 1** | **Delete objects after 7 days** | Automatically prunes dumps older than 7 days, maintaining a sliding 7-day restore window. |
| **Lifecycle Rule 2** | **Abort incomplete multipart uploads after 7 days** | Automatically cleans up partial uploads, preventing hidden storage charges. |
| **API Token** | `vibelock-backup-automation` | Scoped token with **Object Read & Write** permissions restricted strictly to `vibelock-db-backups`. |

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
  - With a 7-day retention policy, the steady-state storage footprint is approximately **35 MB to 350 MB**, consuming less than 4% of the 10 GB free allowance.
- **Disclaimer:** Zero cost cannot be legally guaranteed if storage volume, operation count, or runner minutes exceed applicable provider free-tier limits.

---

### 2.4 Coverage and Exclusions Boundary

| System Asset | Covered by Automated Backup? | Recovery Strategy / Responsible Layer |
| :--- | :---: | :--- |
| **PostgreSQL Schema & Tables** | **YES** | Restored via `pg_restore` from `.dump.age` artifact into target PostgreSQL instance. |
| **Relational Data & Records** | **YES** | Restored via `pg_restore` (Users, Orders, Payments, Inventory, Audit Logs). |
| **PostgreSQL Cluster Roles & Privileges** | **NO** | `pg_dump` targets database `neondb`. Global cluster roles, database creation DDL, and server-level permissions must be maintained via infrastructure setup. |
| **Cloudinary Media Assets** | **NO** | **Critical Distinction:** The database stores only image metadata and CDN URLs (`ProductImage.url`, `User.image`, `Banner.imageUrl`, `ReturnRequest` attachments). If Cloudinary assets are deleted, database restoration will point to missing 404 URLs. Cloudinary requires independent backup (e.g., Cloudinary automatic backup to an S3/R2 bucket or periodic asset sync). |
| **Application Source Code** | **NO** | Maintained under Git version control in GitHub (`saddaulsiam/vibelock-web`). Immutable commit history. |
| **Vercel Runtime Configuration** | **NO** | Deployment builds, edge routing, and environment variables stored in Vercel project settings. |
| **Environment Secrets & API Keys** | **NO** | Secret keys (`AUTH_SECRET`, `SSLCOMMERZ_*`, `CLOUDINARY_*`, `RESEND_API_KEY`) must be backed up securely in an encrypted team vault (e.g., 1Password or Bitwarden). |
| **Payment Gateway Configuration** | **NO** | SSLCOMMERZ store ID, secret keys, IPN webhooks, and merchant credentials reside in provider portals. |
| **Courier / Shipping Configuration** | **NO** | Pathao, Steadfast, and Paperfly API credentials and webhook registrations reside in courier partner portals. |

---

## 3. GitHub Actions Secrets Configuration

To enable the automated backup workflow, the repository owner must configure five secrets in GitHub:

**Navigation:** `GitHub Repository` $\rightarrow$ `Settings` $\rightarrow$ `Secrets and variables` $\rightarrow$ `Actions` $\rightarrow$ `New repository secret`

| Secret Name | Value Description | Example / Format |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | Neon direct PostgreSQL connection string (direct unpooled compute endpoint, port 5432 with `sslmode=require`). Bypasses PgBouncer pooler for reliable `pg_dump` streaming locks. | `postgres://user:password@ep-cool-butterfly-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| **`R2_ACCESS_KEY_ID`** | Cloudflare R2 token Access Key ID from the `vibelock-backup-automation` token. | `a1b2c3d4e5f67890abcdef1234567890` (32 characters) |
| **`R2_SECRET_ACCESS_KEY`** | Cloudflare R2 token Secret Access Key from the `vibelock-backup-automation` token. | `0123456789abcdef...` (64-character hex string) |
| **`R2_ACCOUNT_ID`** | Cloudflare Account ID (located in the right sidebar of the Cloudflare R2 overview dashboard). | `abc123def45678901234567890abcdef` (32 characters) |
| **`BACKUP_AGE_RECIPIENT`** | Public `age` recipient key generated locally by the owner. | `age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p` |

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

In addition to the daily automated run at 03:00 UTC (09:00 Asia/Dhaka), you can trigger an immediate backup:

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
   *Expected output: List of `.dump.age` and `.dump.age.sha256` files.*
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
*Expected output: Valid TOC table of contents listing schemas, tables, and sequence definitions.*

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

| Compromise Scenario | Threat Impact | Required Immediate Containment Actions |
| :--- | :--- | :--- |
| **R2 API Token Compromised** | Attacker has read/write access to R2 bucket. | 1. Immediately revoke the token in Cloudflare Dashboard.<br>2. Generate a new R2 API token and update GitHub Secrets.<br>3. Inspect bucket object list for unauthorized additions or deletions.<br>*(Note: Existing backups remain encrypted with `age`; attacker cannot read database contents without the offline private key).* |
| **`DATABASE_URL` Compromised** | Attacker has read access to production database. | 1. Reset database user password immediately in Neon Console.<br>2. Update `DATABASE_URL` and `DIRECT_URL` in Vercel environment variables.<br>3. Update `DATABASE_URL` in GitHub Actions Secrets.<br>4. Inspect database audit logs for unauthorized queries. |
| **`age` Private Key Compromised** | Attacker with bucket access can decrypt backup archives. | 1. Generate a new `age` key pair locally (`age-keygen`).<br>2. Update `BACKUP_AGE_RECIPIENT` in GitHub Actions Secrets.<br>3. Trigger an immediate manual backup to produce a backup under the new key.<br>4. Securely archive or re-encrypt historical backups under the new key. |
| **GitHub Actions Runner Compromised** | Attacker compromises CI environment during execution. | 1. Rotate all repository secrets (`DATABASE_URL`, R2 tokens).<br>2. Revoke GitHub personal access tokens and review repository collaborator permissions.<br>3. Audit workflow run logs. |

---

## 8. Emergency Disaster Recovery Checklist

```markdown
[ ] 1. INCIDENT DECLARED: Classify severity (SEV-1). Notify Project Owner.
[ ] 2. OWNER AUTHORIZATION: Obtain written owner authorization before touching production.
[ ] 3. WRITE FREEZE: Enable Maintenance Mode on Vercel; pause payment/courier webhooks.
[ ] 4. FORENSIC RECORD: Record incident detection time and save current database logs.
[ ] 5. SELECT RECOVERY SOURCE:
      - If <= 6h: Create isolated Neon branch at T_safe via Neon Console / CLI.
      - If > 6h: Download offsite backup from R2, verify sha256, decrypt with offline age key.
[ ] 6. RESTORE TO ISOLATED TARGET: Restore into a NEW isolated Neon branch or staging database (NEVER in-place production).
[ ] 7. VERIFY INTEGRITY: Execute read-only SQL verification suite (Section 6).
      - Confirm 0 orphan records.
      - Confirm inventory ledger invariant holds.
      - Confirm orders, payments, refunds match.
[ ] 8. PRISMA VALIDATION: Run `npx prisma validate` against isolated target.
[ ] 9. MEDIA AUDIT: Check Cloudinary image URLs for HTTP 200 reachability.
[ ] 10. CUTOVER APPROVAL: Present verification evidence to Owner. Receive explicit written approval.
[ ] 11. SWITCH CONNECTION: Update DATABASE_URL and DIRECT_URL in Vercel Production secrets.
[ ] 12. REDEPLOY: Deploy and verify cache purge.
[ ] 13. SMOKE TESTS: Execute GET smoke tests on /, /shop, /login, /register, and cart.
[ ] 14. RESTORE TRAFFIC: Disable Maintenance Mode.
[ ] 15. RECONCILIATION: Audit SSLCOMMERZ gateway transactions during delta gap; notify affected users.
[ ] 16. POST-MORTEM: Complete blameless post-mortem report.
```
