import "server-only";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { isCustomerSuspended } from "./suspension";

/**
 * Retrieves the currently authenticated user with real-time profile data from the database.
 * This guarantees that immediate profile updates (avatar photo, display name)
 * reflect in the header instantly without waiting for a JWT token refresh.
 *
 * Security guarantees:
 * - V-02: Returns null if the user record does not exist in the database (no stale JWT fallback).
 * - Fail closed: Returns null if database lookup throws an error.
 * - V-04: Returns null if the customer account is suspended.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!dbUser) {
      return null;
    }

    if (dbUser.role === "CUSTOMER" && (await isCustomerSuspended(dbUser.id))) {
      return null;
    }

    return {
      ...session.user,
      id: dbUser.id,
      name: dbUser.name ?? session.user.name,
      email: dbUser.email ?? session.user.email,
      phone: dbUser.phone ?? null,
      image: dbUser.image ?? null,
      role: dbUser.role ?? session.user.role,
      emailVerified: dbUser.emailVerified ?? session.user.emailVerified,
    };
  } catch (error) {
    console.error("[getCurrentUser] Failed to fetch live user profile (failing closed):", error);
    return null;
  }
}
