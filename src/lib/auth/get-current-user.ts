import "server-only";
import { auth } from "@/auth";

/**
 * Retrieves the currently authenticated user from the session.
 * Safely typed and strictly Server-only.
 * Returns null if the user is not authenticated.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
