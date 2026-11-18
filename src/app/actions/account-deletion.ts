"use server";

import prisma from "@/lib/prisma/client";
import { requireUser } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { compare } from "bcryptjs";
import { z } from "zod";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

class AccountDeletionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountDeletionBlockedError";
  }
}

export async function deleteAccountAction(data: { password?: string }) {
  try {
    const user = await requireUser();

    try {
      await checkRateLimit("accountDeletion", user.id);
    } catch {
      return { error: "Too many attempts. Please try again later." };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, role: true },
    });

    if (!dbUser) {
      return { error: "Account not found." };
    }

    // SEC-10: Administrative and staff accounts cannot be deleted via customer self-service
    const resolvedRole = dbUser.role ?? user.role;
    if (resolvedRole === "ADMIN" || resolvedRole === "MANAGER" || resolvedRole === "STAFF") {
      return {
        error:
          "Administrative and staff accounts cannot be self-deleted through customer settings. Contact system administration.",
      };
    }

    // Require password if the account has a password
    if (dbUser.passwordHash) {
      const parsed = deleteAccountSchema.safeParse(data);
      if (!parsed.success) {
        return { error: "Password is required to delete this account." };
      }

      const isValid = await compare(parsed.data.password, dbUser.passwordHash);
      if (!isValid) {
        return { error: "Incorrect password." };
      }
    } else {
      // Phase 2H: Do not invent a weak workaround for passwordless accounts.
      // The current UI relies entirely on password confirmation. We must identify a design change
      // (e.g., OAuth re-authentication or Email OTP) rather than skipping confirmation.
      return {
        error:
          "Account deletion for OAuth-only accounts requires re-authentication (Design pending).",
      };
    }

    // Account Deletion Transaction
    // Encapsulate row locking, active checks, cart purge, session revocation,
    // audit log creation and user deletion atomically to eliminate race conditions.
    await prisma.$transaction(async (tx) => {
      // 0. Acquire exclusive row locks in consistent hierarchy:
      // a. User record (serializes against checkout and concurrent account updates)
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;

      // b. All Order records belonging to user (serializes against concurrent return request creation and status updates)
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "userId" = ${user.id} FOR UPDATE`;

      // c. All Payment records belonging to user's orders (serializes against concurrent refund processing)
      await tx.$queryRaw`
        SELECT p."id"
        FROM "Payment" p
        JOIN "Order" o ON p."orderId" = o."id"
        WHERE o."userId" = ${user.id}
        FOR UPDATE
      `;

      // 1. Guard: Check active / in-transit orders (evaluated AFTER row locks are acquired)
      const activeOrders = await tx.order.count({
        where: {
          userId: user.id,
          status: {
            in: [
              "PENDING",
              "CONFIRMED",
              "PROCESSING",
              "SHIPPED",
              "RETURN_REQUESTED",
              "RETURN_PROCESSING",
            ],
          },
        },
      });

      if (activeOrders > 0) {
        throw new AccountDeletionBlockedError(
          "Cannot delete account while you have active, processing, or in-transit orders."
        );
      }

      // 2. Guard: Check active return requests (PENDING, APPROVED, RECEIVED) (evaluated AFTER row locks are acquired)
      const activeReturns = await tx.returnRequest.count({
        where: {
          order: { userId: user.id },
          status: {
            in: ["PENDING", "APPROVED", "RECEIVED"],
          },
        },
      });

      if (activeReturns > 0) {
        throw new AccountDeletionBlockedError(
          "Cannot delete account while you have active return requests in progress."
        );
      }

      // 3. Guard: Check active refunds (PENDING, PROCESSING) (evaluated AFTER row locks are acquired)
      const activeRefunds = await tx.refund.count({
        where: {
          payment: { order: { userId: user.id } },
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
      });

      if (activeRefunds > 0) {
        throw new AccountDeletionBlockedError(
          "Cannot delete account while you have pending or processing refunds."
        );
      }

      // 4. Purge active cart
      await tx.cart.deleteMany({ where: { userId: user.id } });

      // 5. Invalidate all active sessions
      await tx.session.deleteMany({ where: { userId: user.id } });

      // 6. Record audit log entry before deleting user
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "CUSTOMER_SELF_DELETED",
          entityType: "User",
          entityId: user.id,
          metadata: {
            deletedUserId: user.id,
            email: user.email,
            name: user.name,
            reason: "Customer self-service account deletion",
          },
        },
      });

      // 7. Delete user record (Order and AuditLog use SetNull; Address, Review, Tokens use Cascade)
      await tx.user.delete({ where: { id: user.id } });
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AccountDeletionBlockedError) {
      return { error: error.message };
    }
    console.error("Account deletion error:", error);
    return { error: "An unexpected error occurred." };
  }
}
