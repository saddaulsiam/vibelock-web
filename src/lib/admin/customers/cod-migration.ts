import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export interface CodMigrationResult {
  updatedCount: number;
  blockedCount: number;
  unblockedCount: number;
}

/**
 * Programmatic backfill utility for Phase 5B-2.
 * Backfills User.codBlocked, User.codBlockedAt, and User.codBlockedById
 * from the latest authoritative AuditLog event for every affected customer.
 *
 * Deterministic selection:
 * entityType = 'Customer'
 * action IN ('CUSTOMER_COD_RESTRICTED', 'CUSTOMER_COD_ALLOWED')
 * ORDER BY createdAt DESC, id DESC
 */
export async function backfillCustomerCodRestrictions(
  customTx?: Prisma.TransactionClient
): Promise<CodMigrationResult> {
  const db = customTx ?? prisma;

  // 1. Fetch all relevant audit log events sorted deterministically
  const auditLogs = await db.auditLog.findMany({
    where: {
      entityType: "Customer",
      action: {
        in: ["CUSTOMER_COD_RESTRICTED", "CUSTOMER_COD_ALLOWED"],
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    select: {
      id: true,
      entityId: true,
      action: true,
      createdAt: true,
      actorId: true,
    },
  });

  // 2. Identify latest event per customer (first seen wins due to desc sort)
  const latestEventsByCustomer = new Map<
    string,
    { action: string; createdAt: Date; actorId: string | null }
  >();

  for (const log of auditLogs) {
    if (!latestEventsByCustomer.has(log.entityId)) {
      latestEventsByCustomer.set(log.entityId, {
        action: log.action,
        createdAt: log.createdAt,
        actorId: log.actorId,
      });
    }
  }

  let updatedCount = 0;
  let blockedCount = 0;
  let unblockedCount = 0;

  for (const [customerId, event] of latestEventsByCustomer.entries()) {
    const isBlocked = event.action === "CUSTOMER_COD_RESTRICTED";
    if (isBlocked) {
      blockedCount++;
    } else {
      unblockedCount++;
    }

    await db.user.updateMany({
      where: {
        id: customerId,
        role: "CUSTOMER",
      },
      data: {
        codBlocked: isBlocked,
        codBlockedAt: isBlocked ? event.createdAt : null,
        codBlockedById: isBlocked ? event.actorId : null,
      },
    });
    updatedCount++;
  }

  return { updatedCount, blockedCount, unblockedCount };
}

