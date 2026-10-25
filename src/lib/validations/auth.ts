import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Normalizes a Bangladeshi phone number to 11-digit local format (e.g. 01712345678).
 */
export function normalizeBdPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+880")) return "0" + cleaned.slice(4);
  if (cleaned.startsWith("880")) return "0" + cleaned.slice(3);
  return cleaned;
}

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
