import "server-only";
import crypto from "crypto";
import prisma from "@/lib/prisma/client";

/**
 * Generate and dispatch a 6-digit numeric OTP for phone verification.
 * In development, logs the OTP prominently to the server console and returns it for frictionless testing.
 */
export async function sendOtp(phone: string): Promise<{ success: boolean; devOtp?: string }> {
  // Generate cryptographically random 6-digit numeric OTP
  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const tokenHash = crypto.createHash("sha256").update(`${phone}:${rawOtp}`).digest("hex");
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5-minute validity window

  // Invalidate any older OTPs for this phone number
  await prisma.verificationToken.deleteMany({
    where: { identifier: `phone_otp:${phone}` },
  });

  // Store new verification record
  await prisma.verificationToken.create({
    data: {
      identifier: `phone_otp:${phone}`,
      token: tokenHash,
      expires,
    },
  });

  // Highlight OTP in console for local development and testing
  console.log(
    `\n┌───────────────────────────────────────────────┐\n` +
      `│ 📱 [VibeLock SMS Gateway - Development Mode]    │\n` +
      `│ Phone: ${phone.padEnd(38)} │\n` +
      `│ OTP Code: ${rawOtp.padEnd(35)} │\n` +
      `│ Valid for: 5 minutes                          │\n` +
      `└───────────────────────────────────────────────┘\n`
  );

  const isDev = process.env.NODE_ENV !== "production";
  return { success: true, devOtp: isDev ? rawOtp : undefined };
}

/**
 * Verify a submitted 6-digit OTP for a phone number.
 * Single-use token: invalidates on successful verification to prevent replay attacks.
 */
export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const tokenHash = crypto.createHash("sha256").update(`${phone}:${otp.trim()}`).digest("hex");

  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier: `phone_otp:${phone}`,
      token: tokenHash,
      expires: { gt: new Date() },
    },
  });

  if (!record) {
    return false;
  }

  // Consume token immediately upon success
  await prisma.verificationToken.deleteMany({
    where: { identifier: `phone_otp:${phone}` },
  });

  return true;
}
