import { z } from "zod";

/**
 * Normalizes a Bangladeshi phone number to 11-digit local format (e.g. 01712345678).
 */
export function normalizeBdPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+880")) return "0" + cleaned.slice(4);
  if (cleaned.startsWith("880")) return "0" + cleaned.slice(3);
  return cleaned;
}

/**
 * Validates whether a phone number matches the Bangladeshi 11-digit mobile operator prefixes (013-019).
 */
export function isValidBdPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const normalized = normalizeBdPhoneNumber(phone);
  return /^01[3-9]\d{8}$/.test(normalized);
}

/**
 * Validates standard email address format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates whether an identifier is either a valid email address or a valid Bangladeshi mobile number.
 */
export function isValidLoginIdentifier(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  return isValidEmail(trimmed) || isValidBdPhoneNumber(trimmed);
}

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email or phone number is required")
    .refine((val) => isValidLoginIdentifier(val), {
      message: "Please enter a valid email address or 11-digit Bangladeshi mobile number.",
    }),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || !val.trim() || isValidBdPhoneNumber(val),
        { message: "Please enter a valid 11-digit Bangladeshi mobile number." }
      ),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const phoneOtpRequestSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .transform(normalizeBdPhoneNumber)
    .refine((val) => /^01[3-9]\d{8}$/.test(val), {
      message: "Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678).",
    }),
});

export type PhoneOtpRequestInput = z.infer<typeof phoneOtpRequestSchema>;

export const phoneOtpVerifySchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .transform(normalizeBdPhoneNumber)
    .refine((val) => /^01[3-9]\d{8}$/.test(val), {
      message: "Please enter a valid 11-digit Bangladeshi mobile number.",
    }),
  otp: z
    .string()
    .length(6, "OTP code must be exactly 6 digits.")
    .regex(/^\d{6}$/, "OTP must contain digits only."),
  name: z.string().optional(),
});

export type PhoneOtpVerifyInput = z.infer<typeof phoneOtpVerifySchema>;
