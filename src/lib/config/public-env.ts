import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
});

const _publicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
});

if (!_publicEnv.success) {
  console.error("❌ Invalid environment variables (Client):", _publicEnv.error.format());
  throw new Error("Invalid public environment variables");
}

const isLocalhost =
  _publicEnv.data.NEXT_PUBLIC_APP_URL.includes("localhost") ||
  _publicEnv.data.NEXT_PUBLIC_APP_URL.includes("127.0.0.1");

if (
  process.env.NODE_ENV === "production" &&
  !isLocalhost &&
  !/^https:\/\//i.test(_publicEnv.data.NEXT_PUBLIC_APP_URL)
) {
  throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production");
}

export const publicEnv = _publicEnv.data;
