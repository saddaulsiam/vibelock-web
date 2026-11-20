import "server-only";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma/client";

const SENSITIVE_WORDS = new Set([
  "password",
  "secret",
  "token",
  "apikey",
  "card",
  "cvv",
  "cvc",
  "pin",
  "auth",
  "authorization",
  "cookie",
  "sessionid",
]);

const SENSITIVE_SUBSTRINGS = [
  "password",
  "secret",
  "token",
  "apikey",
  "cardnumber",
  "cardno",
  "creditcard",
  "debitcard",
  "cvv",
  "cvc",
  "sessionid",
];

/**
 * Checks whether a key is sensitive, normalizing across camelCase, snake_case,
 * kebab-case, and dot-separated naming conventions.
 */
export function isSensitiveAuditKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_\s.]/g, "");
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[-_\s.]+/);

  return (
    words.some((w) => SENSITIVE_WORDS.has(w)) ||
    SENSITIVE_SUBSTRINGS.some((s) => normalized.includes(s))
  );
}

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
    if (isSensitiveAuditKey(key)) {
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
    const errorMsg = `[AuditLog] Audit logging unavailable: auditLog model or create() method is missing on Prisma client.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
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
