import "server-only";
import crypto from "crypto";
import prisma from "@/lib/prisma/client";

/**
 * Redacts a phone number for safe logging (e.g., "+88017****1234" or "017****1234").
 * Safely accepts string, null, undefined, and unexpected runtime values.
 * Returns "****" for null, undefined, non-string, and empty/whitespace input.
 */
export function maskPhoneNumber(phone?: unknown): string {
  if (typeof phone !== "string") {
    return "****";
  }
  const clean = phone.trim();
  if (clean.length <= 4) {
    return "****";
  }
  if (clean.length <= 8) {
    return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 5)}****${clean.slice(-3)}`;
}

/**
 * Generate and dispatch a 6-digit numeric OTP for phone verification.
 * In development, logs the OTP to the server console and returns it for local testing.
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

  // Strictly only return devOtp in local development environment
  const isDev = process.env.NODE_ENV === "development";

  // Highlight OTP in console for local development and testing with masked phone
  if (isDev) {
    const maskedPhone = maskPhoneNumber(phone);
    console.log(
      `\n┌───────────────────────────────────────────────┐\n` +
        `│ 📱 [VibeLock SMS Gateway - Development Mode]    │\n` +
        `│ Phone: ${maskedPhone.padEnd(38)} │\n` +
        `│ OTP Code: ${rawOtp.padEnd(35)} │\n` +
        `│ Valid for: 5 minutes                          │\n` +
        `└───────────────────────────────────────────────┘\n`
    );
  }

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

  // Safe developer / audit logging (masks phone and OTP digits)
  if (process.env.NODE_ENV !== "production") {
    if (process.env.NODE_ENV === "development") {
      const maskedPhone = maskPhoneNumber(cleanPhone);
      const sanitizedBody = message.replace(/\b\d{4,8}\b/g, "******");
      console.log(
        `📱 [SMS Simulation - ${purpose.toUpperCase()}] To: ${maskedPhone} | Body: "${sanitizedBody}"`
      );
    }
    return true;
  }

  try {
    // In production, dispatch via configured BD SMS gateway (e.g., Greenweb, ElitBuzz, BulkSMSBD)
    const smsApiKey = process.env.SMS_API_KEY;
    const smsSenderId = process.env.SMS_SENDER_ID || "VibeLock";

    if (!smsApiKey) {
      console.warn(
        `[SMS] SMS_API_KEY not configured in production. SMS notification skipped for ${maskPhoneNumber(cleanPhone)}.`
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
