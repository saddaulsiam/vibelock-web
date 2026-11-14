import "server-only";
import prisma from "@/lib/prisma/client";

/**
 * Checks whether a customer account is currently suspended based on the most recent
 * suspension audit log entry.
 *
 * AuditLog records:
 * - action: "CUSTOMER_ACCOUNT_SUSPENDED" -> account is suspended
 * - action: "CUSTOMER_ACCOUNT_ACTIVATED" -> account is active
 *
 * Fails closed on database errors by returning true (access blocked).
 */
export async function isCustomerSuspended(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const suspension = await prisma.auditLog.findFirst({
      where: {
        entityType: "Customer",
        entityId: userId,
        action: { in: ["CUSTOMER_ACCOUNT_SUSPENDED", "CUSTOMER_ACCOUNT_ACTIVATED"] },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { action: true },
    });

    return suspension?.action === "CUSTOMER_ACCOUNT_SUSPENDED";
  } catch (error) {
    console.error("[isCustomerSuspended] Database error during suspension check (failing closed):", error);
    return true; // Fail closed on database error to prevent unauthorized access
  }
}
