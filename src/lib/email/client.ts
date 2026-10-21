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

export async function sendNewsletterWelcomeEmail(email: string): Promise<boolean> {
  if (!resendClient) {
    if (env.NODE_ENV === "production") {
      console.error(
        "❌ CRITICAL: Email provider not configured in production. Cannot send newsletter welcome email."
      );
      return false;
    }
    console.warn("⚠️ Email provider not configured. Skipping newsletter welcome email for:", email);
    return true;
  }

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Welcome to VibeLock // You're on the list",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0A0D10; color: #F3F0E8; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          <div style="background-color: #000; padding: 28px 24px; border-bottom: 2px solid #00D9FF; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #FFFFFF;">
              VIBE<span style="color: #00D9FF;">LOCK</span>
            </h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.6);">
              Streetwear For Dhaka Youth
            </p>
          </div>
          <div style="padding: 32px 24px;">
            <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
              You're in the inner circle.
            </h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: rgba(243,240,232,0.85);">
              Welcome to the crew! You'll now be the first to know whenever a limited drop lands, exclusive vault discount codes release, and seasonal collections go live.
            </p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${appConfig.url}" style="display: inline-block; padding: 12px 28px; background-color: #00D9FF; color: #0A0D10; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 8px;">
                Explore New Drops
              </a>
            </div>
            <p style="margin: 24px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
              You received this email because you subscribed to VibeLock updates. Stay fresh.
            </p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send newsletter welcome email (Provider Error):", error);
    return false;
  }
}

