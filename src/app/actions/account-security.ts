"use server";

import prisma from "@/lib/prisma/client";
import { requireUser } from "@/lib/auth/authorization";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/account";
import { hash, compare } from "bcryptjs";
import crypto from "crypto";

// ----------------------------------------------------------------------
// RATE LIMITING GAP DOCUMENTATION
// Currently, there is no production-ready Redis/Upstash rate limiting
// infrastructure available in this project.
// Abusive endpoints (Change Password, Forgot Password, Reset Password)
// should have rate-limiting integrated here in a future phase.
// ----------------------------------------------------------------------

export async function changePasswordAction(data: ChangePasswordInput) {
  try {
    const user = await requireUser();
    const parsed = changePasswordSchema.parse(data);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!dbUser || !dbUser.passwordHash) {
      // User might be OAuth-only or doesn't exist
      return { error: "Cannot change password for this account." };
    }

    const isValid = await compare(parsed.currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return { error: "Incorrect current password." };
    }

    const newPasswordHash = await hash(parsed.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      // Invalidate all existing sessions for this user.
      // NextAuth database sessions rely on the Session table.
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    // Note: Deleting all sessions will log out the current user as well.
    // They will need to log back in.
    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function forgotPasswordAction(data: ForgotPasswordInput) {
  try {
    const parsed = forgotPasswordSchema.parse(data);
    const email = parsed.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    // If user doesn't exist or doesn't have a password (e.g. OAuth), we act like it succeeded to prevent enumeration
    if (!user || !user.passwordHash) {
      return { success: true };
    }

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Hash it for database storage to prevent leakage
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // TODO: Phase X - Integrate real Email Provider
    // For now, in a real app this would send the `rawToken` to the user's email.
    // Because we have no email provider yet, we do nothing.
    // In local dev, we could log it for testing, but prompt says: "no token exposure in server logs"

    return { success: true };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function resetPasswordAction(data: ResetPasswordInput) {
  try {
    const parsed = resetPasswordSchema.parse(data);

    // Hash the raw token to look it up in the database
    const tokenHash = crypto.createHash("sha256").update(parsed.token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken) {
      return { error: "Invalid or expired token." };
    }

    if (resetToken.usedAt) {
      return { error: "Token has already been used." };
    }

    if (resetToken.expiresAt < new Date()) {
      return { error: "Token has expired." };
    }

    const newPasswordHash = await hash(parsed.newPassword, 12);

    // Consume token atomically to prevent race condition reuse
    const tokenConsumption = await prisma.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    if (tokenConsumption.count === 0) {
      return { error: "Token has already been used or is invalid." };
    }

    // Now update password and invalidate sessions safely
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newPasswordHash },
      }),
      // Invalidate all active sessions for the user to force re-login
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { error: "An unexpected error occurred." };
  }
}
