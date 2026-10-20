"use server";

import prisma from "@/lib/prisma/client";
import { z } from "zod";
import crypto from "crypto";
import { sendEmailVerificationEmail } from "@/lib/email/client";
import { checkRateLimit } from "@/lib/security/rate-limit";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function verifyEmailAction(data: { token: string }) {
  try {
    const parsed = verifyEmailSchema.parse(data);

    // Hash the token for secure lookup
    const tokenHash = crypto.createHash("sha256").update(parsed.token).digest("hex");

    try {
      // Token is cryptographically unique — use token-only bucket (no IP) to avoid
      // false rate-limit hits when the page re-renders or the user refreshes.
      await checkRateLimit("verifyEmail", tokenHash, { skipIp: true });
    } catch {
      return { error: "Too many requests. Please try again later." };
    }

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { emailVerified: true } } },
    });

    if (!verificationToken) {
      return { error: "Invalid or expired verification link." };
    }

    if (verificationToken.user.emailVerified) {
      return { success: true }; // Already verified
    }

    if (verificationToken.usedAt) {
      return { error: "This verification link has already been used." };
    }

    if (verificationToken.expiresAt < new Date()) {
      return { error: "This verification link has expired." };
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Atomically consume token and update user
        const tokenConsumption = await tx.emailVerificationToken.updateMany({
          where: {
            id: verificationToken.id,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        });

        if (tokenConsumption.count === 0) {
          throw new Error("ALREADY_USED");
        }

        await tx.user.update({
          where: { id: verificationToken.userId },
          data: { emailVerified: new Date() },
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === "ALREADY_USED") {
        return { error: "This verification link has already been used or is invalid." };
      }
      throw err;
    }

    return { success: true };
  } catch (error) {
    console.error("Email verification error:", error);
    return { error: "An unexpected error occurred during verification." };
  }
}

const resendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export async function resendVerificationAction(data: { email: string }) {
  try {
    const parsed = resendVerificationSchema.parse(data);
    const email = parsed.email.toLowerCase();

    try {
      await checkRateLimit("resendVerification", email);
    } catch {
      return { error: "Too many requests. Please try again later." };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    // If user doesn't exist or is already verified, return generic success
    if (!user || user.emailVerified) {
      return { success: true };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12); // 12 hours

    // Invalidate previous unused tokens for this user and create the new one atomically
    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      }),
      prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const emailSent = await sendEmailVerificationEmail(email, rawToken);

    if (!emailSent) {
      await prisma.emailVerificationToken.delete({
        where: { tokenHash },
      });
      console.error("Failed to deliver resend verification email. Token invalidated.");
    }

    return { success: true };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { error: "An unexpected error occurred." };
  }
}
