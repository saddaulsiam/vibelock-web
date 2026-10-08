import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),

  // Authentication
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // Cloudinary placeholders
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // SSLCommerz placeholders
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),
  SSLCOMMERZ_SANDBOX: z.coerce.boolean().default(true),

  // Shipping
  COURIER_WEBHOOK_SECRET: z.string().optional(),
  SHIPPING_PROVIDER: z.enum(["mock", "steadfast"]).optional(),
  STEADFAST_API_KEY: z.string().optional(),
  STEADFAST_SECRET_KEY: z.string().optional(),
  STEADFAST_BASE_URL: z.string().url().optional(),

  // Email Configuration
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("VibeLock <noreply@vibelock.com.bd>"),

  // Upstash Redis (Rate Limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Inventory
  INVENTORY_RESERVATION_TTL_SECONDS: z.coerce.number().default(900),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables (Server):", _env.error.format());
  throw new Error("Invalid server environment variables");
}

if (
  _env.data.NODE_ENV === "production" &&
  process.env.VITEST !== "true" &&
  _env.data.AUTH_SECRET.length < 32
) {
  throw new Error("AUTH_SECRET must be at least 32 characters in production");
}

export const env = _env.data;
