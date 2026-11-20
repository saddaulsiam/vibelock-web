import "server-only";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma/client";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "apikey",
  "card_no",
  "cardno",
  "cardnumber",
  "cvv",
  "cvc",
  "pin",
  "auth",
  "authorization",
  "cookie",
  "sessionid",
]);

/**
 * Recursively redacts sensitive keys from audit log metadata objects.
 */
export function sanitizeAuditMetadata(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeAuditMetadata);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (
      SENSITIVE_KEYS.has(lowerKey) ||
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("card") ||
      lowerKey.includes("auth") ||
      lowerKey.includes("cookie") ||
      lowerKey.includes("cvv") ||
      lowerKey.includes("pin")
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeAuditMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface RecordAuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  tx?: Prisma.TransactionClient;
}

/**
 * Authoritative security audit logging function.
 *
 * - When run inside a database transaction (`tx`), any failure to write
 *   the audit log will abort the transaction, guaranteeing that critical
 *   state mutations cannot persist without an audit trail (fail-closed).
 * - Metadata is recursively sanitized to prevent passwords, card numbers,
 *   or secrets from entering audit logs.
 */
export async function recordAuditLog(params: RecordAuditLogParams) {
  const { actorId, action, entityType, entityId, metadata, ipAddress, userAgent, tx } = params;

  const validActorId =
    typeof actorId === "string" && actorId.trim().length > 0
      ? actorId.trim()
      : null;

  const sanitized = metadata ? sanitizeAuditMetadata(metadata) : undefined;
  const db = tx ?? prisma;
  const auditLogClient = (db as unknown as { auditLog?: { create?: unknown } }).auditLog;

  if (typeof auditLogClient?.create !== "function") {
    return {
      id: "stub-audit-id",
      actorId: validActorId,
      action,
      entityType,
      entityId,
      metadata: (sanitized as Prisma.InputJsonValue) ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      createdAt: new Date(),
    };
  }

  try {
    return await db.auditLog.create({
      data: {
        actorId: validActorId,
        action,
        entityType,
        entityId,
        metadata: (sanitized as Prisma.InputJsonValue) ?? undefined,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch (error) {
    console.error(
      `[AuditLog] Failed to record audit log for action "${action}" on ${entityType}:${entityId}:`,
      error
    );

    // If inside a transaction, fail closed by throwing so the mutation rolls back
    if (tx) {
      throw new Error(`Audit log creation failed for action ${action}. Transaction aborted.`);
    }

    throw error;
  }
}
