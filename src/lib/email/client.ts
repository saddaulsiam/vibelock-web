import "server-only";

import { env } from "@/lib/config/env";
import { appConfig } from "@/lib/config/app";
import { Resend } from "resend";

let resendClient: Resend | null = null;

if (env.RESEND_API_KEY) {
  resendClient = new Resend(env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(email: string, rawToken: string): Promise<boolean> {
  if (!resendClient) {
    if (env.NODE_ENV === "production") {
      console.error(
        "❌ CRITICAL: Email provider not configured in production. Cannot send password reset email."
      );
      return false;
    }
    console.warn("⚠️ Email provider not configured. Skipping password reset email for:", email);
    return true; // Pretend it succeeded in dev/test to allow local token usage manually
  }

  const resetUrl = new URL("/reset-password", appConfig.url);
  resetUrl.searchParams.set("token", rawToken);

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Reset your VibeLock password",
      html: `
        <div style="font-family: sans-serif; max-w-2xl; margin: 0 auto;">
          <h2>VibeLock Password Reset</h2>
          <p>You recently requested to reset your password for your VibeLock account.</p>
          <p>Click the link below to reset it. This link is valid for 1 hour.</p>
          <p>
            <a href="${resetUrl.toString()}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
          </p>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            If you did not request a password reset, please ignore this email.
            Do not share this link with anyone.
          </p>
        </div>
      `,
    });
    return true;
  } catch {
    console.error("Failed to send password reset email (Provider Error).");
    // We catch the error internally so we can return false. The caller will handle cleanup.
    return false;
  }
}

export async function sendEmailVerificationEmail(
  email: string,
  rawToken: string
): Promise<boolean> {
  if (!resendClient) {
    if (env.NODE_ENV === "production") {
      console.error(
        "❌ CRITICAL: Email provider not configured in production. Cannot send verification email."
      );
      return false;
    }
    console.warn("⚠️ Email provider not configured. Skipping verification email for:", email);
    return true; // Pretend it succeeded in dev/test to allow local token usage manually
  }

  const verifyUrl = new URL("/verify-email", appConfig.url);
  verifyUrl.searchParams.set("token", rawToken);

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Verify your VibeLock account",
      html: `
        <div style="font-family: sans-serif; max-w-2xl; margin: 0 auto;">
          <h2>Welcome to VibeLock</h2>
          <p>Please verify your email address to complete your account setup.</p>
          <p>Click the link below to verify. This link is valid for 12 hours.</p>
          <p>
            <a href="${verifyUrl.toString()}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">
              Verify Email
            </a>
          </p>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            If you did not create an account with VibeLock, please ignore this email.
          </p>
        </div>
      `,
    });
    return true;
  } catch {
    console.error("Failed to send verification email (Provider Error).");
    return false;
  }
}
