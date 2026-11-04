import "server-only";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";

/**
 * Retrieves the currently authenticated user with real-time profile data from the database.
 * This guarantees that immediate profile updates (avatar photo, display name)
 * reflect in the header instantly without waiting for a JWT token refresh.
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
        image: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!dbUser) {
      return session.user;
    }

    return {
      ...session.user,
      id: dbUser.id,
      name: dbUser.name ?? session.user.name,
      email: dbUser.email ?? session.user.email,
      image: dbUser.image ?? null,
      role: dbUser.role ?? session.user.role,
      emailVerified: dbUser.emailVerified ?? session.user.emailVerified,
    };
  } catch (error) {
    console.error("[getCurrentUser] Failed to fetch live user profile:", error);
    return session.user;
  }
}
