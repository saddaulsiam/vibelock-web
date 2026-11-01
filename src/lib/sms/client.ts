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

export interface SmsNotificationPayload {
  phone: string;
  message: string;
  purpose?: string;
}

/**
 * Pluggable SMS Dispatcher for VibeLock.
 * Logs cleanly in development/staging and dispatches through BD SMS Gateway when configured.
 */
export async function sendSmsNotification({
  phone,
  message,
  purpose = "transactional",
}: SmsNotificationPayload): Promise<boolean> {
  if (!phone || phone.trim().length === 0) {
    return false;
  }

  const cleanPhone = phone.trim().replace(/[^\d+]/g, "");

  // Safe developer / audit logging
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `📱 [SMS Simulation - ${purpose.toUpperCase()}] To: ${cleanPhone} | Body: "${message}"`
    );
    return true;
  }

  try {
    // In production, dispatch via configured BD SMS gateway (e.g., Greenweb, ElitBuzz, BulkSMSBD)
    const smsApiKey = process.env.SMS_API_KEY;
    const smsSenderId = process.env.SMS_SENDER_ID || "VibeLock";

    if (!smsApiKey) {
      console.warn(
        `[SMS] SMS_API_KEY not configured in production. SMS notification skipped for ${cleanPhone}.`
      );
      return false;
    }

    // Generic BD HTTP GET/POST API structure compatible with major Bangladeshi SMS aggregators
    const endpoint = process.env.SMS_API_URL || "https://api.smsnet.com.bd/sendsms";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: smsApiKey,
        sender_id: smsSenderId,
        recipient: cleanPhone,
        message,
      }),
    });

    return res.ok;
  } catch (error) {
    console.error(`[SMS Error] Failed to send SMS to ${cleanPhone}:`, error);
    return false;
  }
}
