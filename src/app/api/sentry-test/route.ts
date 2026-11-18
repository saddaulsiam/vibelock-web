import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Temporary Sentry Verification Route (Preview Only)
 *
 * This route is strictly for verifying Sentry error monitoring in Vercel Preview.
 * It is hard-guarded to return 404 in every other environment (production, development, local).
 * It has zero database, authentication, payment, order, or external service dependencies.
 *
 * Must be deleted before merging into main.
 */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    notFound();
  }

  throw new Error("Sentry Verification: Isolated Preview Test Exception");
}
