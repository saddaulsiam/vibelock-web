-- AlterTable: Add dedicated COD restriction state to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "codBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "codBlockedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "codBlockedById" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_codBlocked_idx" ON "User"("codBlocked");

-- Data Migration Backfill:
-- Authoritatively backfills codBlocked, codBlockedAt, and codBlockedById from existing AuditLog records.
-- Deterministic ordering: createdAt DESC, id DESC ensures the latest event wins and ties are resolved deterministically.
WITH latest_cod_events AS (
  SELECT DISTINCT ON ("entityId")
    "entityId" AS user_id,
    "action",
    "createdAt" AS event_time,
    "actorId" AS actor_id
  FROM "AuditLog"
  WHERE "entityType" = 'Customer'
    AND "action" IN ('CUSTOMER_COD_RESTRICTED', 'CUSTOMER_COD_ALLOWED')
  ORDER BY "entityId", "createdAt" DESC, "id" DESC
)
UPDATE "User" u
SET
  "codBlocked" = (lce."action" = 'CUSTOMER_COD_RESTRICTED'),
  "codBlockedAt" = CASE WHEN lce."action" = 'CUSTOMER_COD_RESTRICTED' THEN lce.event_time ELSE NULL END,
  "codBlockedById" = CASE WHEN lce."action" = 'CUSTOMER_COD_RESTRICTED' THEN lce.actor_id ELSE NULL END
FROM latest_cod_events lce
WHERE u."id" = lce.user_id
  AND u."role" = 'CUSTOMER';

