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
      // For OAuth users without a password, we might need a different confirmation flow.
      // But for Phase 2G, we are strictly focused on Credentials accounts.
      // If they somehow have no password, we could let them delete it directly or require an email confirmation.
      // We will allow it directly here since they authenticated, but in a real app, an OAuth user might need to re-authenticate with their provider.
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
