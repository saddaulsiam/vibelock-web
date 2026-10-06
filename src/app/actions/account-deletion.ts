"use server";

import prisma from "@/lib/prisma/client";
import { requireUser } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { compare } from "bcryptjs";
import { z } from "zod";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

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
      select: { passwordHash: true },
    });

    if (!dbUser) {
      return { error: "Account not found." };
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
    // As reviewed, the schema allows safe deletion.
    // Order, Cart, AuditLog use SetNull on userId.
    // Address, Session, Account, Review, Tokens use Cascade.
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Account deletion error:", error);
    return { error: "An unexpected error occurred." };
  }
}
