import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),

  // Authentication
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),

  // Cloudinary placeholders
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // SSLCommerz placeholders
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),
  SSLCOMMERZ_SANDBOX: z.coerce.boolean().default(true),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables (Server):", _env.error.format());
  throw new Error("Invalid server environment variables");
}

export const env = _env.data;
