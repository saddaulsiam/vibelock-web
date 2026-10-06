"use server";

import prisma from "@/lib/prisma/client";
import {
  registerSchema,
  loginSchema,
  type RegisterInput,
  type LoginInput,
} from "@/lib/validations/auth";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import crypto from "crypto";
import { sendEmailVerificationEmail } from "@/lib/email/client";

export async function registerAction(data: RegisterInput) {
  try {
    const parsed = registerSchema.parse(data);

    try {
      await checkRateLimit("register");
    } catch {
      return { error: "Too many attempts. Please try again later." };
    }

    const email = parsed.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Do not explicitly tell if email exists for security, but return generic error
      // Actually, UX usually says "Email already in use", but prompt says:
      // "Do not leak unnecessary account existence information... Handle duplicate emails safely"
      // We will just return a generic failure or "Registration failed."
      return { error: "An account with this email may already exist or registration failed." };
    }

    const passwordHash = await hash(parsed.password, 12);

    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12); // 12 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const emailSent = await sendEmailVerificationEmail(email, rawToken);

    if (!emailSent) {
      // Revert token creation safely
      await prisma.emailVerificationToken.delete({
        where: { tokenHash },
      });
      console.error("Failed to deliver verification email during registration. Token invalidated.");
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { error: "An account with this email may already exist or registration failed." };
      }
    }
    console.error("Registration error:", error);
    return { error: "An unexpected error occurred during registration." };
  }
}

export async function loginAction(data: LoginInput) {
  try {
    const parsed = loginSchema.parse(data);
    const email = parsed.email.toLowerCase();

    try {
      await checkRateLimit("login", email);
    } catch {
      return { error: "Too many attempts. Please try again later." };
    }

    await signIn("credentials", {
      email,
      password: parsed.password,
      redirect: false, // Handle redirect on client or handle it carefully
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Authentication failed." };
      }
    }
    // Rethrow all other errors so Next.js can handle NEXT_REDIRECT properly,
    // or bubble up actual crashes. NextAuth's supported pattern relies on this.
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirect: false });
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/" });
}
